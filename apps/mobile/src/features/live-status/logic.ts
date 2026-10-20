import type {
  LivePalette,
  LiveState,
  LiveStatusProps,
  MuteState,
  Session,
  SessionState,
} from '@remote-harness/protocol'
import type { TFunction } from '../../core/i18n/create'
import type { Theme } from '../../core/theme/palettes'

/**
 * A finished turn stays on the lock screen this long, as "done" (same window as the daemon); a new
 * turn in that window reuses its activity.
 */
export const DONE_DISMISS_MS = 15 * 60_000

export function liveStateFor(state: SessionState): LiveState {
  switch (state) {
    case 'running':
      return 'working'
    case 'waiting':
      return 'waiting'
    case 'idle':
      return 'done'
    case 'ended':
      return 'closed'
  }
}

export function isMutedSession(session: Pick<Session, 'id' | 'profileId'>, muted: MuteState): boolean {
  return muted.sessions.includes(session.id) || muted.profiles.includes(session.profileId)
}

/**
 * Sessions whose live status should start now: they turned `running` since `previous` (unknown
 * sessions count as not running), are not muted, and the setting is on.
 */
export function sessionsToStart(
  previous: Readonly<Record<string, Pick<Session, 'state'>>>,
  current: Readonly<Record<string, Session>>,
  { enabled, muted }: { enabled: boolean; muted: MuteState },
): string[] {
  if (!enabled) return []
  return Object.values(current)
    .filter((s) => s.state === 'running' && previous[s.id]?.state !== 'running' && !isMutedSession(s, muted))
    .map((s) => s.id)
}

/**
 * The session folder with the user's home shortened to `~`. The app does not know the computer's
 * home, so it recognizes the usual ones (macOS `/Users/<name>`, Linux and WSL `/home/<name>`).
 */
export function shortenHome(path: string): string {
  return path.replace(/^\/(?:Users|home)\/[^/]+(?=\/|$)/, '~')
}

/** The theme colors the live status is drawn with (sent on register and in the app's own props). */
export function livePalette(theme: Theme): LivePalette {
  const { background, text, textMuted, accent, success, warning } = theme.colors
  return { background, text, textMuted, accent, success, warning }
}

/** What the app knows about a live status besides the session itself. */
export type LocalLiveInfo = {
  /** Profile name. */
  title: string
  /** Daemon computer name, empty when the daemon does not send it. */
  host: string
  startedAt: number
  changedAt: number
  endedAt: number | null
  /** App theme colors when the status started. */
  palette?: LivePalette
}

/** Tasks a session runs in parallel: its background tasks plus the subagents still running. */
export function parallelTasks(session: Partial<Pick<Session, 'backgroundTasks' | 'subagents'>>): number {
  return (
    (session.backgroundTasks ?? 0) + (session.subagents ?? []).filter((s) => s.state === 'running').length
  )
}

/** Props for an update made by the app itself (no steps: only the daemon follows the transcript). */
export function localLiveProps(
  session: Pick<Session, 'state' | 'title' | 'cwd'> & Partial<Pick<Session, 'backgroundTasks' | 'subagents'>>,
  info: LocalLiveInfo,
  t: TFunction,
): LiveStatusProps {
  const state = liveStateFor(session.state)
  const tasks = parallelTasks(session)
  return {
    title: info.title,
    state,
    status: t(`liveStatus.states.${state}`),
    step: '',
    tools: '',
    startedAt: info.startedAt,
    host: info.host,
    session: session.title,
    path: shortenHome(session.cwd),
    recent: [],
    ago: t('liveStatus.ago'),
    changedAt: info.changedAt,
    endedAt: info.endedAt,
    glyphs: [],
    pending: null,
    hint: '',
    tasks: tasks > 0 ? t('liveStatus.tasks', { count: tasks }) : '',
    ...(info.palette ? { palette: info.palette } : {}),
  }
}

/** Which Live Activity belongs to a session, persisted so restarts never lose track of it. */
export type ActivityRecord = {
  activityId: string
  /** When the turn finished (the done window starts), epoch milliseconds; null while working. */
  doneAt: number | null
}
export type ActivityMap = Record<string, ActivityRecord>

export type Reconciled = {
  /** Session id → activity id to keep tracking (and register again). */
  adopt: Record<string, string>
  /** Activities of the app to end now: unknown ones and those of sessions no longer live. */
  end: string[]
  /** The record to persist: only adopted activities. */
  map: ActivityMap
}

/** The session a Live Activity's deep link opens (`claude-remote://session/<id>`), or `null`. */
export function sessionIdFromActivityUrl(url: string | null | undefined): string | null {
  const match = /^(?:claude-remote|remoteharness):\/\/session\/([^/?#]+)/.exec(url ?? '')
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

/** Activities no record names: their deep links, and the sessions this phone follows. */
export type FollowedOrphans = {
  /** Activity id → the deep link it was started with (`null` when unknown). */
  urls: Readonly<Record<string, string | null>>
  followed: ReadonlySet<string>
}

/**
 * Matches the activities iOS still has (`alive`) with the saved record. An activity is adopted when
 * its session exists and is running or waiting, or is idle inside the done window (from `doneAt`,
 * else the session's last change). An activity no record names is adopted when its deep link names
 * a followed session that is running or waiting and has none yet (the daemon started it by push).
 * Every other alive activity is ended: one live status per session.
 */
export function reconcileActivities(
  map: Readonly<ActivityMap>,
  alive: readonly string[],
  sessions: Readonly<Record<string, Pick<Session, 'state' | 'updatedAt'>>>,
  now: number,
  orphans?: FollowedOrphans,
): Reconciled {
  const aliveIds = new Set(alive)
  const adopt: Record<string, string> = {}
  const kept: ActivityMap = {}
  const claimed = new Set<string>()
  for (const [sessionId, record] of Object.entries(map)) {
    if (!aliveIds.has(record.activityId) || claimed.has(record.activityId)) continue
    const session = sessions[sessionId]
    if (!session) continue
    const live = session.state === 'running' || session.state === 'waiting'
    const doneAt = record.doneAt ?? Date.parse(session.updatedAt)
    const inWindow = session.state === 'idle' && Number.isFinite(doneAt) && now - doneAt < DONE_DISMISS_MS
    if (!live && !inWindow) continue
    adopt[sessionId] = record.activityId
    kept[sessionId] = live ? { activityId: record.activityId, doneAt: null } : { ...record, doneAt }
    claimed.add(record.activityId)
  }
  for (const activityId of alive) {
    if (!orphans || claimed.has(activityId)) continue
    const sessionId = sessionIdFromActivityUrl(orphans.urls[activityId])
    const state = sessionId ? sessions[sessionId]?.state : undefined
    if (!sessionId || !orphans.followed.has(sessionId) || adopt[sessionId]) continue
    if (state !== 'running' && state !== 'waiting') continue
    adopt[sessionId] = activityId
    kept[sessionId] = { activityId, doneAt: null }
    claimed.add(activityId)
  }
  return { adopt, end: alive.filter((id) => !claimed.has(id)), map: kept }
}

/** The saved record, whatever was stored (unreadable → empty, malformed entries dropped). */
export function parseActivityMap(raw: string | null): ActivityMap {
  if (!raw) return {}
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return {}
    const map: ActivityMap = {}
    for (const [sessionId, record] of Object.entries(value as Record<string, unknown>)) {
      const r = record as Partial<ActivityRecord> | null
      if (r && typeof r.activityId === 'string' && (typeof r.doneAt === 'number' || r.doneAt === null)) {
        map[sessionId] = { activityId: r.activityId, doneAt: r.doneAt }
      }
    }
    return map
  } catch {
    return {}
  }
}

/**
 * The decision behind a Live Activity button target (`allow:<requestId>` / `deny:<requestId>`), or
 * `null` for any other interaction.
 */
export function liveAction(target: string): { requestId: string; decision: 'allow' | 'deny' } | null {
  const match = /^(allow|deny):(.+)$/.exec(target)
  if (!match?.[1] || !match[2]) return null
  return { requestId: match[2], decision: match[1] === 'allow' ? 'allow' : 'deny' }
}

/** Button targets the widget emits for a pending permission. */
export function liveActionTarget(decision: 'allow' | 'deny', requestId: string): string {
  return `${decision}:${requestId}`
}
