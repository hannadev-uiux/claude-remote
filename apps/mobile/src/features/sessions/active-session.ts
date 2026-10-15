/** Extracts the session id from routes like `/session/abc`, `/session/abc/terminal` or `/session/abc/agent/xyz`. */
export function extractSessionIdFromPathname(pathname: string): string | null {
  return pathname.match(/^\/session\/([^/]+)/)?.[1] ?? null
}
