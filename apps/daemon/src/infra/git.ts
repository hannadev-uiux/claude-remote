import type { Checkout } from '@claude-remote/protocol'
import type { Executor } from './exec.ts'

const GIT_TIMEOUT_MS = 5_000

/** The git calls the daemon needs to know where a session works. Every call goes through the executor. */
export class GitClient {
  constructor(
    private readonly exec: Executor,
    private readonly bin = 'git',
  ) {}

  /**
   * Root of the worktree that contains `dir` and its branch (`null` when detached), or `null` when
   * `dir` is not inside a git checkout (or git fails for any reason).
   */
  async checkout(dir: string): Promise<Checkout | null> {
    const run = (args: string[]) => this.exec(this.bin, ['-C', dir, ...args], { timeoutMs: GIT_TIMEOUT_MS })
    try {
      const top = await run(['rev-parse', '--show-toplevel'])
      const root = top.stdout.trim()
      if (top.exitCode !== 0 || !root) return null
      // symbolic-ref also works in a repository without commits; it fails when HEAD is detached.
      const head = await run(['symbolic-ref', '--short', '-q', 'HEAD'])
      return { root, branch: (head.exitCode === 0 && head.stdout.trim()) || null }
    } catch {
      return null
    }
  }
}
