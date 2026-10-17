import type { Checkout } from '@remote-harness/protocol'
import type { GitClient } from '../../infra/git.ts'

export const CHECKOUT_CACHE_MS = 15_000

/** Resolves directories to git checkouts, caching each answer for a short while. */
export class CheckoutResolver {
  private readonly cache = new Map<string, { at: number; value: Promise<Checkout | null> }>()

  constructor(
    private readonly git: Pick<GitClient, 'checkout'>,
    private readonly ttlMs = CHECKOUT_CACHE_MS,
    private readonly now: () => number = Date.now,
  ) {}

  /** `fresh` skips the cache (and refreshes it). */
  resolve(dir: string, options: { fresh?: boolean } = {}): Promise<Checkout | null> {
    if (!dir) return Promise.resolve(null)
    const hit = this.cache.get(dir)
    if (hit && !options.fresh && this.now() - hit.at < this.ttlMs) return hit.value
    const value = this.git.checkout(dir)
    this.cache.set(dir, { at: this.now(), value })
    return value
  }
}

/** Whether a store change may have moved the session to another checkout or branch. */
export function needsCheckout(
  session: { cwd: string; state: string },
  previous: { cwd: string; state: string } | undefined,
): boolean {
  if (!previous || previous.cwd !== session.cwd) return true
  // A new turn: the branch may have been switched since the last one.
  return session.state === 'running' && previous.state !== 'running'
}

/** Name for `claude --worktree`: valid as a branch and as a directory, sortable by time. */
export function worktreeName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `remote-${day}-${time}`
}
