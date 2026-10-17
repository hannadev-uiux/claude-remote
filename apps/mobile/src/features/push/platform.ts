/** Android notification channel; the daemon sends `android.notification.channelId` with this id. */
export const NOTIFICATION_CHANNEL_ID = 'claude-remote'
/** Low-importance channel of the live status (`android.notification.channelId` of the daemon's live pushes). */
export const LIVE_STATUS_CHANNEL_ID = 'live-status'

/**
 * Whether this build has Firebase for `os` (`app.config.ts` puts `{ ios, android }` in `extra.firebase`
 * according to which Google services files existed at build time).
 */
export function firebaseEnabledFor(extra: unknown, os: string): boolean {
  if (!extra || typeof extra !== 'object') return false
  const firebase = (extra as { firebase?: unknown }).firebase
  if (!firebase || typeof firebase !== 'object') return false
  return (firebase as Record<string, unknown>)[os] === true
}

/**
 * On Android a tap on a notification shown by FCM may reach the app through both RN Firebase and
 * expo-notifications; handle each notification once.
 */
export function createTapDeduper(windowMs = 3000) {
  const seen = new Map<string, number>()
  return (key: string, now: number): boolean => {
    for (const [k, at] of seen) if (now - at > windowMs) seen.delete(k)
    if (seen.has(key)) return false
    seen.set(key, now)
    return true
  }
}
