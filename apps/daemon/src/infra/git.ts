import * as nodeFs from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, normalize } from 'node:path'
import type { Checkout, WorktreeInfo } from '@remote-harness/protocol'
import type { Executor } from './exec.ts'

const GIT_TIMEOUT_MS = 5_000
/** Pushes talk to the network. */
const PUSH_TIMEOUT_MS = 60_000
/** `git worktree remove` deletes the whole folder (node_modules included): only the cross-device fallback uses it. */
const REMOVE_TIMEOUT_MS = 10 * 60_000
/** Inside the repository's git dir: never shown by `git status`, and on the worktree's file system in the usual layout. */
export const TRASH_DIR = 'remote-harness-trash'

export class GitError extends Error {
  override name = 'GitError'
}

/** File system calls of the worktree removal, injected so tests can fake them. */
export type GitFs = Pick<typeof nodeFs, 'rename' | 'mkdir' | 'rm' | 'readdir' | 'realpath'>

export type GitClientOptions = {
  bin?: string
  fs?: GitFs
  /** Whether a process id is running (stale lock detection). */
  isAlive?: (pid: number) => boolean
  /** Reports a failed background delete of a removed worktree's folder. */
  onPurgeError?: (path: string, error: unknown) => void
}

export type WorktreeEntry = { path: string; branch: string | null; locked: string | null }

/** Entries of `git worktree list --porcelain`; `locked` is the reason (`''` when locked without one). */
export function parseWorktreeList(output: string): WorktreeEntry[] {
  const entries: WorktreeEntry[] = []
  for (const block of output.split(/\n\s*\n/)) {
    let entry: WorktreeEntry | null = null
    for (const line of block.split('\n')) {
      if (line.startsWith('worktree ')) entry = { path: line.slice(9), branch: null, locked: null }
      else if (!entry) continue
      else if (line.startsWith('branch ')) entry.branch = line.slice(7).replace(/^refs\/heads\//, '')
      else if (line === 'locked') entry.locked = ''
      else if (line.startsWith('locked ')) entry.locked = line.slice(7)
    }
    if (entry) entries.push(entry)
  }
  return entries
}

/** The process id a lock reason names (`… (pid 4242 start …)`, as Claude Code writes it), if any. */
export function lockPid(reason: string): number | null {
  const match = /\bpid (\d+)\b/.exec(reason)
  const pid = match ? Number(match[1]) : Number.NaN
  return Number.isInteger(pid) && pid > 0 ? pid : null
}

function defaultIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // EPERM: it exists but belongs to someone else.
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))

/** The git calls the daemon needs: where a session works, and its worktree's state and cleanup. Every call goes through the executor. */
export class GitClient {
  private readonly bin: string
  private readonly fs: GitFs
  private readonly isAlive: (pid: number) => boolean
  private readonly onPurgeError: (path: string, error: unknown) => void

  constructor(
    private readonly exec: Executor,
    options: GitClientOptions = {},
  ) {
    this.bin = options.bin ?? 'git'
    this.fs = options.fs ?? nodeFs
    this.isAlive = options.isAlive ?? defaultIsAlive
    this.onPurgeError = options.onPurgeError ?? (() => {})
  }

  private run(dir: string, args: string[], timeoutMs = GIT_TIMEOUT_MS) {
    return this.exec(this.bin, ['-C', dir, ...args], { timeoutMs })
  }

  /**
   * Runs git and throws `GitError` when it fails: git's message, else the timeout (a killed git
   * prints nothing), else the exit code.
   */
  private async must(dir: string, args: string[], timeoutMs = GIT_TIMEOUT_MS): Promise<string> {
    const result = await this.run(dir, args, timeoutMs)
    if (result.exitCode === 0 && !result.timedOut) return result.stdout
    const command = `git ${args.slice(0, 2).join(' ')}`
    const message =
      result.stderr.trim() ||
      (result.timedOut
        ? `${command} timed out after ${Math.round(timeoutMs / 1000)} s`
        : `${command} exited with code ${result.exitCode}`)
    throw new GitError(message)
  }

  /**
   * Root of the worktree that contains `dir` and its branch (`null` when detached), or `null` when
   * `dir` is not inside a git checkout (or git fails for any reason).
   */
  async checkout(dir: string): Promise<Checkout | null> {
    try {
      const top = await this.run(dir, ['rev-parse', '--show-toplevel'])
      const root = top.stdout.trim()
      if (top.exitCode !== 0 || !root) return null
      // symbolic-ref also works in a repository without commits; it fails when HEAD is detached.
      const head = await this.run(dir, ['symbolic-ref', '--short', '-q', 'HEAD'])
      return { root, branch: (head.exitCode === 0 && head.stdout.trim()) || null }
    } catch {
      return null
    }
  }

  /** Whether the repository of `dir` has the local branch `branch` (false when git fails). */
  async hasBranch(dir: string, branch: string): Promise<boolean> {
    try {
      const result = await this.run(dir, ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`])
      return result.exitCode === 0 && !result.timedOut
    } catch {
      return false
    }
  }

  /**
   * The linked worktree that contains `dir` with its state, or `null` for the repository's main
   * checkout (its git dir is the common dir) and for anything outside git.
   */
  async worktreeInfo(dir: string): Promise<WorktreeInfo | null> {
    try {
      const ids = await this.run(dir, ['rev-parse', '--show-toplevel', '--git-dir', '--git-common-dir'])
      if (ids.exitCode !== 0) return null
      const [top = '', gitDir = '', commonDir = ''] = ids.stdout.split('\n').map((line) => line.trim())
      if (!top || !gitDir || !commonDir) return null
      // git prints the dirs relative to the cwd it ran in (`dir`) when they are inside it.
      const absolute = (p: string) => normalize(isAbsolute(p) ? p : join(dir, p))
      const gitDirAbs = absolute(gitDir)
      const commonAbs = absolute(commonDir)
      if (gitDirAbs === commonAbs) return null
      const head = await this.run(top, ['symbolic-ref', '--short', '-q', 'HEAD'])
      const status = await this.must(top, ['status', '--porcelain'])
      const dirty = status.split('\n').filter((line) => line.trim()).length
      // Commits reachable from HEAD and from no remote ref: covers "ahead of upstream" and "no upstream".
      const unpushedOut = await this.run(top, ['rev-list', '--count', 'HEAD', '--not', '--remotes'])
      const unpushed = unpushedOut.exitCode === 0 ? Number(unpushedOut.stdout.trim()) || 0 : 0
      return {
        path: top,
        branch: (head.exitCode === 0 && head.stdout.trim()) || null,
        mainRoot: dirname(commonAbs),
        dirty,
        unpushed,
      }
    } catch {
      return null
    }
  }

  /** Stages everything and commits it (hooks skipped: this is a save, not a review); no-op when clean. */
  async commitAll(dir: string, message: string): Promise<void> {
    await this.must(dir, ['add', '-A'])
    const status = await this.must(dir, ['status', '--porcelain'])
    if (!status.trim()) return
    await this.must(dir, ['commit', '--no-verify', '-m', message])
  }

  /** Pushes HEAD to `origin`, creating the upstream when the branch has none. */
  async push(dir: string): Promise<void> {
    await this.must(dir, ['push', '-u', 'origin', 'HEAD'], PUSH_TIMEOUT_MS)
  }

  /**
   * Removes a linked worktree from its main checkout and deletes its branch: safely (`-d`, only when
   * merged) by default, forced (`-D`) when discarding. The main checkout itself is never touched.
   * It completes or leaves the worktree untouched: a stale lock is removed, the folder is moved out
   * of place in one rename, the entry is pruned, and the moved folder is deleted in the background
   * (`purged`). The caller checks for changes first: `git worktree remove`'s own check does not run.
   */
  async removeWorktree(
    info: Pick<WorktreeInfo, 'path' | 'branch' | 'mainRoot'>,
    options: { force?: boolean } = {},
  ): Promise<{ purged: Promise<void> }> {
    const { mainRoot, path } = info
    await this.releaseLock(mainRoot, path)
    const common = (
      await this.must(mainRoot, ['rev-parse', '--path-format=absolute', '--git-common-dir'])
    ).trim()
    const trash = join(common, TRASH_DIR)
    let moved = true
    try {
      await this.fs.mkdir(trash, { recursive: true })
      await this.fs.rename(path, join(trash, `${basename(path)}-${Date.now()}`))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EXDEV') {
        throw new GitError(`could not move the worktree folder: ${errorText(error)}`)
      }
      // Another file system: git deletes it in place, with time to finish.
      moved = false
      const force = options.force ? ['--force'] : []
      await this.must(mainRoot, ['worktree', 'remove', ...force, path], REMOVE_TIMEOUT_MS)
    }
    await this.must(mainRoot, ['worktree', 'prune'])
    if (info.branch) await this.run(mainRoot, ['branch', options.force ? '-D' : '-d', info.branch])
    return { purged: moved ? this.purge(trash) : Promise.resolve() }
  }

  /** Removes a lock left by a process that is gone; a lock held by a running process stops the removal. */
  private async releaseLock(mainRoot: string, path: string): Promise<void> {
    const list = parseWorktreeList(await this.must(mainRoot, ['worktree', 'list', '--porcelain']))
    const real = await this.fs.realpath(path).catch(() => path)
    let entry: WorktreeEntry | undefined
    for (const item of list) {
      if (item.path === path || (await this.fs.realpath(item.path).catch(() => item.path)) === real) {
        entry = item
        break
      }
    }
    if (!entry || entry.locked === null) return
    const pid = lockPid(entry.locked)
    if (pid !== null && this.isAlive(pid)) {
      throw new GitError(`the worktree is locked by a running process (pid ${pid}): ${entry.locked}`)
    }
    await this.must(mainRoot, ['worktree', 'unlock', path])
  }

  /** Deletes everything in the trash folder: this removal and leftovers of interrupted ones. Never throws. */
  private async purge(trash: string): Promise<void> {
    const names = await this.fs.readdir(trash).catch(() => [] as string[])
    for (const name of names) {
      const path = join(trash, String(name))
      await this.fs
        .rm(path, { recursive: true, force: true, maxRetries: 3 })
        .catch((error: unknown) => this.onPurgeError(path, error))
    }
  }
}
