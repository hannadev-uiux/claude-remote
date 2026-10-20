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

/** Longest worktree name derived from a session name. */
export const WORKTREE_SLUG_MAX = 40

/**
 * A session name as a worktree and branch name: accents folded, lowercase, anything else than
 * letters and digits turned into single dashes, cut at a dash within the limit. Empty when nothing
 * usable is left.
 */
export function worktreeSlug(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (slug.length <= WORKTREE_SLUG_MAX) return slug
  const cut = slug.slice(0, WORKTREE_SLUG_MAX)
  const dash = cut.lastIndexOf('-')
  return (dash > 0 ? cut.slice(0, dash) : cut).replace(/-+$/, '')
}

/** Names tried in order for a named worktree: the slug, then `-2` to `-9`. */
export function worktreeCandidates(slug: string): string[] {
  if (!slug) return []
  return [slug, ...Array.from({ length: 8 }, (_, i) => `${slug}-${i + 2}`)]
}
