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
 * What the "Waiting for you" strip shows: every pending request of a session that has not ended,
 * plus every controllable `waiting` session without a request in the store, oldest first. A
 * read-only session cannot be answered from the phone, and an ended one waits for nobody (older
 * daemons could leave both marked `waiting`). `null` when nothing waits.
 */
export function pendingForStrip(
  sessions: readonly Session[],
  allRequests: readonly PermissionRequestInfo[],
): StripModel | null {
  const byId = new Map(sessions.map((session) => [session.id, session]))
  const requests = allRequests.filter((request) => byId.get(request.sessionId)?.state !== 'ended')
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
      .filter(
        (session) => session.state === 'waiting' && session.controllable && !withRequest.has(session.id),
      )
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
