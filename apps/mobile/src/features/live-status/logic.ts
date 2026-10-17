import type { LiveState, LiveStatusProps, MuteState, Session, SessionState } from '@remote-harness/protocol'
import type { TFunction } from '../../core/i18n/create'

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

/** Props for an update made by the app itself (no step: only the daemon follows the transcript). */
export function localLiveProps(
  session: Pick<Session, 'state'>,
  title: string,
  startedAt: number,
  t: TFunction,
): LiveStatusProps {
  const state = liveStateFor(session.state)
  return { title, state, status: t(`liveStatus.states.${state}`), step: '', tools: '', startedAt }
}
