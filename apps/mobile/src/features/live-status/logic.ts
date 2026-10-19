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

/** A finished turn stays on the lock screen this long (same as the daemon's end). */
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

/** Props for an update made by the app itself (no steps: only the daemon follows the transcript). */
export function localLiveProps(
  session: Pick<Session, 'state' | 'title' | 'cwd'>,
  info: LocalLiveInfo,
  t: TFunction,
): LiveStatusProps {
  const state = liveStateFor(session.state)
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
    ...(info.palette ? { palette: info.palette } : {}),
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
