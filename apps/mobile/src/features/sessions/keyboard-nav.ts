/** Next id when navigating the list with the arrow keys; `null` with no sessions. With no cursor, enters from the end matching the movement direction. */
export function moveCursor(sessionIds: string[], cursor: string | null, delta: 1 | -1): string | null {
  if (sessionIds.length === 0) return null
  const index = cursor ? sessionIds.indexOf(cursor) : -1
  if (index === -1) return delta > 0 ? sessionIds[0]! : sessionIds[sessionIds.length - 1]!
  const next = Math.min(Math.max(index + delta, 0), sessionIds.length - 1)
  return sessionIds[next]!
}
