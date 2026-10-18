import type { PermissionRequestInfo, Session } from '@remote-harness/protocol'

/** One thing waiting for the user: a pending request, or a waiting session with nothing to answer. */
export type StripItem =
  | { kind: 'request'; request: PermissionRequestInfo; session: Session | null; since: number }
  | { kind: 'waiting'; session: Session; since: number }

export type StripModel = {
  /** Distinct sessions waiting (several requests in one session count once). */
  sessions: number
  /** The oldest item, shown in the strip. */
  oldest: StripItem
  /** The item after it (target of "+N more"), if any. */
  next: StripItem | null
  /** Items besides the oldest. */
  more: number
}

/**
 * What the "Waiting for you" strip shows: every pending request plus every `waiting` session
 * without a request in the store, oldest first. `null` when nothing waits.
 */
export function pendingForStrip(
  sessions: readonly Session[],
  requests: readonly PermissionRequestInfo[],
): StripModel | null {
  const byId = new Map(sessions.map((session) => [session.id, session]))
  const withRequest = new Set(requests.map((request) => request.sessionId))
  const items: StripItem[] = [
    ...requests.map(
      (request): StripItem => ({
        kind: 'request',
        request,
        session: byId.get(request.sessionId) ?? null,
        since: Date.parse(request.createdAt),
      }),
    ),
    ...sessions
      .filter((session) => session.state === 'waiting' && !withRequest.has(session.id))
      .map((session): StripItem => ({ kind: 'waiting', session, since: Date.parse(session.updatedAt) })),
  ].sort((a, b) => a.since - b.since)
  const oldest = items[0]
  if (!oldest) return null
  const ids = new Set(
    items.map((item) => (item.kind === 'request' ? item.request.sessionId : item.session.id)),
  )
  return { sessions: ids.size, oldest, next: items[1] ?? null, more: items.length - 1 }
}

export function stripSessionId(item: StripItem): string {
  return item.kind === 'request' ? item.request.sessionId : item.session.id
}

/** `m:ss`, or `h:mm:ss` from one hour on; never negative. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = String(total % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`
}
