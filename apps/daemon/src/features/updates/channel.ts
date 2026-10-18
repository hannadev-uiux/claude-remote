/** Branches the installer can follow: `main` (stable) or `development`. */
export const UPDATE_CHANNELS = ['main', 'development'] as const
export type UpdateChannel = (typeof UPDATE_CHANNELS)[number]

export function isUpdateChannel(value: string): value is UpdateChannel {
  return (UPDATE_CHANNELS as readonly string[]).includes(value)
}

/** Compares `x.y.z` versions numerically (pre-release and build suffixes ignored): <0, 0 or >0. */
export function compareVersions(a: string, b: string): number {
  const parts = (v: string) =>
    v
      .replace(/^v/, '')
      .split(/[-+]/)[0]!
      .split('.')
      .map((n) => Number.parseInt(n, 10) || 0)
  const x = parts(a)
  const y = parts(b)
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const diff = (x[i] ?? 0) - (y[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/**
 * How to name an available update: its version, plus the short commit when the version did not
 * change (a new commit on `development` usually keeps the number).
 */
export function updateLabel(available: { version: string | null; commit: string }, current: string): string {
  const commit = available.commit.slice(0, 7)
  if (!available.version) return commit
  return available.version === current ? `${available.version} (${commit})` : available.version
}

/** True when updating to `next` goes back to an older version (e.g. development → main). */
export function isDowngrade(current: string, next: string | null): boolean {
  return next !== null && compareVersions(next, current) < 0
}

/**
 * Nobody is waiting on Claude: no session running or waiting and no pending permission request.
 * Automatic updates (which restart the daemon) only happen then.
 */
export function isQuietMoment(
  sessions: readonly { id: string; state: string }[],
  hasPendingPermission: (sessionId: string) => boolean,
): boolean {
  return sessions.every((s) => s.state !== 'running' && s.state !== 'waiting' && !hasPendingPermission(s.id))
}

/** Running under launchd (KeepAlive) or systemd (`Restart=always`): exiting restarts the daemon. */
export function underServiceManager(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.XPC_SERVICE_NAME?.includes('claude-remote') || env.INVOCATION_ID)
}
