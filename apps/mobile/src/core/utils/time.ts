/** Short relative time in pt-BR ("agora", "há 5 min", "há 2 h", "há 3 d"). Hermes lacks RelativeTimeFormat. */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return ''
  const seconds = Math.max(0, Math.round((now - then) / 1000))
  if (seconds < 45) return 'agora'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.round(hours / 24)
  return `há ${days} d`
}

/** `~/workspaces/api` instead of `/Users/me/workspaces/api` when the home prefix is known. */
export function shortPath(path: string): string {
  return path.replace(/^\/Users\/[^/]+/, '~')
}
