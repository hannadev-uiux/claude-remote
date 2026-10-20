/**
 * How to show a session's conversation from the current path: nothing when it is already shown,
 * in place of another session's conversation (so back still leads to the list, not through earlier
 * sessions), pushed from anywhere else (the list, a terminal, settings).
 */
export function openSessionMode(pathname: string, sessionId: string): 'stay' | 'replace' | 'push' {
  const match = pathname.match(/^\/session\/([^/]+)$/)
  if (!match?.[1]) return 'push'
  return decodeURIComponent(match[1]) === sessionId ? 'stay' : 'replace'
}
