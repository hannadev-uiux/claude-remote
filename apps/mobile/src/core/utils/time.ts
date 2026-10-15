import type { TFunction } from '../i18n/create'

/** Short relative time ("now", "5 min ago", "2 h ago", "3 d ago"). Hermes lacks RelativeTimeFormat. */
export function relativeTime(iso: string, t: TFunction, now: number = Date.now()): string {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return ''
  const seconds = Math.max(0, Math.round((now - then) / 1000))
  if (seconds < 45) return t('time.now')
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return t('time.minutesAgo', { count: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return t('time.hoursAgo', { count: hours })
  const days = Math.round(hours / 24)
  return t('time.daysAgo', { count: days })
}

/** `~/workspaces/api` instead of `/Users/me/workspaces/api` when the home prefix is known. */
export function shortPath(path: string): string {
  return path.replace(/^\/Users\/[^/]+/, '~')
}
