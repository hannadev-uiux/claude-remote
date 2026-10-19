import { realpathSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { envVar } from '../../core/env.ts'
import { dataHome } from '../../core/paths.ts'
import type { Executor } from '../../infra/exec.ts'

/**
 * Where `install.sh` keeps the code (`REMOTE_HARNESS_SRC`, else `src` in the data directory), with symlinks
 * resolved like the path of the running module.
 */
export function installerSourceDir(env: NodeJS.ProcessEnv = process.env, home = homedir()): string {
  const dir = resolve(envVar('SRC', env) || join(dataHome(env, home), 'src'))
  try {
    return realpathSync(dir)
  } catch {
    return dir
  }
}

export type UpdateSource =
  | { ok: true; root: string }
  | { ok: false; reason: 'not-built' }
  | { ok: false; reason: 'not-installer'; root: string }

/**
 * The checkout to update: the repo root of the running `apps/daemon/dist/cli.js`, only when it is
 * the installer's directory (a development clone is never moved to a detached ref).
 */
export function updateSource(cliPath: string | null, installerDir: string): UpdateSource {
  if (!cliPath) return { ok: false, reason: 'not-built' }
  const root = resolve(dirname(cliPath), '..', '..', '..')
  return root === resolve(installerDir) ? { ok: true, root } : { ok: false, reason: 'not-installer', root }
}

/** `version` from a package.json text, or null. */
export function parseVersion(packageJson: string): string | null {
  try {
    const data: unknown = JSON.parse(packageJson)
    const version = data && typeof data === 'object' ? (data as { version?: unknown }).version : undefined
    return typeof version === 'string' && version ? version : null
  } catch {
    return null
  }
}

export type FetchResult =
  | { status: 'dirty' }
  | { status: 'failed'; error: string }
  | { status: 'current'; commit: string }
  | { status: 'available'; commit: string; version: string | null }

const GIT_TIMEOUT_MS = 120_000

/** git steps of `remote-harness update`, run in the installer's checkout. */
export class SourceUpdater {
  constructor(
    private readonly exec: Executor,
    private readonly root: string,
  ) {}

  private git(args: readonly string[]) {
    return this.exec('git', ['-C', this.root, ...args], { timeoutMs: GIT_TIMEOUT_MS })
  }

  /** Fetches `ref` and says whether it differs from the checked-out commit. */
  async fetch(ref: string): Promise<FetchResult> {
    const status = await this.git(['status', '--porcelain', '--untracked-files=no'])
    if (status.exitCode !== 0) return { status: 'failed', error: status.stderr.trim() }
    if (status.stdout.trim()) return { status: 'dirty' }
    const fetched = await this.git(['fetch', '--quiet', '--depth', '1', 'origin', ref])
    if (fetched.exitCode !== 0) return { status: 'failed', error: fetched.stderr.trim() }
    const [head, next] = await Promise.all([
      this.git(['rev-parse', 'HEAD']),
      this.git(['rev-parse', 'FETCH_HEAD']),
    ])
    const commit = next.stdout.trim()
    if (head.stdout.trim() === commit) return { status: 'current', commit }
    const pkg = await this.git(['show', 'FETCH_HEAD:apps/daemon/package.json'])
    return { status: 'available', commit, version: pkg.exitCode === 0 ? parseVersion(pkg.stdout) : null }
  }

  /** Moves the checkout to the fetched commit, so the new `install.sh` does the rest. */
  async checkout(): Promise<boolean> {
    return (await this.git(['checkout', '--quiet', '--detach', 'FETCH_HEAD'])).exitCode === 0
  }

  /** The checked-out commit, or null. */
  async head(): Promise<string | null> {
    const result = await this.git(['rev-parse', 'HEAD'])
    return result.exitCode === 0 ? result.stdout.trim() || null : null
  }

  /** Back to `commit` after a failed update (discarding what the failed build left in tracked files). */
  async restore(commit: string): Promise<boolean> {
    return (await this.git(['checkout', '--quiet', '--force', '--detach', commit])).exitCode === 0
  }
}
