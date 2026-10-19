import type { ErrorEntry } from './scrub'

/** Entries kept on the device. */
export const LOG_LIMIT = 50
/** Entries a report carries. */
export const REPORT_ENTRIES = 20

/** Adds an entry, dropping the oldest beyond `limit`. */
export function appendEntry(
  entries: readonly ErrorEntry[],
  entry: ErrorEntry,
  limit = LOG_LIMIT,
): ErrorEntry[] {
  const next = [...entries, entry]
  return next.length > limit ? next.slice(next.length - limit) : next
}

/** Crashes (fatal JS errors) recorded after `handledAt`, i.e. not yet sent or dismissed. */
export function pendingCrashes(entries: readonly ErrorEntry[], handledAt: string | null): ErrorEntry[] {
  return entries.filter((e) => e.source === 'fatal' && (!handledAt || e.at > handledAt))
}

/** Most recent entries first, at most `limit`, optionally only those after `since`. */
export function recentEntries(
  entries: readonly ErrorEntry[],
  options: { since?: string | null; limit?: number } = {},
): ErrorEntry[] {
  const { since = null, limit = REPORT_ENTRIES } = options
  return entries
    .filter((e) => !since || e.at > since)
    .slice(-limit)
    .reverse()
}

/** Parses the stored log; anything malformed yields an empty log. */
export function parseLog(text: string | null): ErrorEntry[] {
  if (!text) return []
  try {
    const value: unknown = JSON.parse(text)
    if (!Array.isArray(value)) return []
    return value.filter(
      (e): e is ErrorEntry =>
        !!e && typeof e === 'object' && typeof e.at === 'string' && typeof e.source === 'string',
    )
  } catch {
    return []
  }
}

/** Same error again within this window is not recorded twice (a request failing in a loop). */
export const DUPLICATE_WINDOW_MS = 60_000

/** Whether `entry` repeats a recent entry (same source, name, message, request type and code). */
export function isDuplicate(
  entries: readonly ErrorEntry[],
  entry: ErrorEntry,
  windowMs = DUPLICATE_WINDOW_MS,
): boolean {
  const since = new Date(new Date(entry.at).getTime() - windowMs).toISOString()
  return entries.some(
    (e) =>
      e.at >= since &&
      e.source === entry.source &&
      e.name === entry.name &&
      e.message === entry.message &&
      e.requestType === entry.requestType &&
      e.code === entry.code,
  )
}
