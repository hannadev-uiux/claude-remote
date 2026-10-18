import { dirname, isAbsolute, join, normalize } from 'node:path'
import type { Checkout, WorktreeInfo } from '@remote-harness/protocol'
import type { Executor } from './exec.ts'

const GIT_TIMEOUT_MS = 5_000
/** Pushes talk to the network. */
const PUSH_TIMEOUT_MS = 60_000

export class GitError extends Error {
  override name = 'GitError'
}

/** The git calls the daemon needs: where a session works, and its worktree's state and cleanup. Every call goes through the executor. */
export class GitClient {
  constructor(
    private readonly exec: Executor,
    private readonly bin = 'git',
  ) {}

  private run(dir: string, args: string[], timeoutMs = GIT_TIMEOUT_MS) {
    return this.exec(this.bin, ['-C', dir, ...args], { timeoutMs })
  }

  /** Runs git and throws `GitError` (with git's message) when it fails. */
  private async must(dir: string, args: string[], timeoutMs?: number): Promise<string> {
    const result = await this.run(dir, args, timeoutMs)
    if (result.exitCode !== 0) throw new GitError(result.stderr.trim() || `git ${args[0]} failed`)
    return result.stdout
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
   */
  async removeWorktree(
    info: Pick<WorktreeInfo, 'path' | 'branch' | 'mainRoot'>,
    options: { force?: boolean } = {},
  ): Promise<void> {
    const force = options.force ? ['--force'] : []
    await this.must(info.mainRoot, ['worktree', 'remove', ...force, info.path])
    await this.run(info.mainRoot, ['worktree', 'prune'])
    if (info.branch) await this.run(info.mainRoot, ['branch', options.force ? '-D' : '-d', info.branch])
  }
}
