import { isLiveSession, type Session } from '@claude-remote/protocol'

/**
 * For each live session, how many other live sessions work in the same git checkout (only ids with
 * at least one). Same rule as `checkoutPeers`, counted in one pass over the list.
 */
export function sharedCheckoutCounts(sessions: readonly Session[]): Record<string, number> {
  const byRoot = new Map<string, string[]>()
  for (const s of sessions) {
    const root = s.checkout?.root
    if (!root || !isLiveSession(s)) continue
    byRoot.set(root, [...(byRoot.get(root) ?? []), s.id])
  }
  const counts: Record<string, number> = {}
  for (const ids of byRoot.values()) {
    if (ids.length < 2) continue
    for (const id of ids) counts[id] = ids.length - 1
  }
  return counts
}
