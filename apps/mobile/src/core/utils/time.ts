import type { TFunction } from '../i18n/create'

/** Compact relative time ("now", "5 min", "2 h", "yesterday", "3 d"). Hermes lacks RelativeTimeFormat. */
export function relativeTime(iso: string, t: TFunction, now: number = Date.now()): string {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return ''
  const seconds = Math.max(0, Math.round((now - then) / 1000))
  if (seconds < 45) return t('time.now')
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return t('time.minutes', { count: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return t('time.hours', { count: hours })
  const days = Math.round(hours / 24)
  if (days === 1) return t('time.yesterday')
  return t('time.days', { count: days })
}

/** Elapsed time as `m:ss`, or `h:mm:ss` from one hour on; never negative (live counters). */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = String(total % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`
}

/** `~/workspaces/api` instead of `/Users/me/workspaces/api` when the home prefix is known. */
export function shortPath(path: string): string {
  return path.replace(/^\/Users\/[^/]+/, '~')
}
