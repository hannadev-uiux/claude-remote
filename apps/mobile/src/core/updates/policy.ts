/** Foreground checks are throttled; a cold start always checks. */
export const FOREGROUND_CHECK_INTERVAL_MS = 30 * 60_000

export function shouldCheck(
  lastCheckedAt: number | null,
  now: number,
  interval = FOREGROUND_CHECK_INTERVAL_MS,
): boolean {
  return lastCheckedAt === null || now - lastCheckedAt >= interval
}

function parts(version: string): number[] {
  return (version.trim().replace(/^v/, '').split(/[-+]/)[0] ?? '')
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0)
}

/** Compares `x.y.z` versions (pre-release/build suffixes ignored): negative, zero or positive. */
export function compareVersions(a: string, b: string): number {
  const [x, y] = [parts(a), parts(b)]
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const diff = (x[i] ?? 0) - (y[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/** True when the connected daemon is older than the app needs. */
export function daemonOutdated(daemonVersion: string | undefined, minimum: string): boolean {
  return daemonVersion !== undefined && compareVersions(daemonVersion, minimum) < 0
}

/** First block of an update UUID, enough to tell updates apart in Settings. */
export function shortUpdateId(id: string | null): string | null {
  return id ? (id.split('-')[0] ?? id) : null
}
