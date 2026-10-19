import type { SessionState } from '@remote-harness/protocol'
import type { KeepAwakeMode } from '../../core/config.ts'

/** How long the computer stays awake after the last active session (the phone may send a prompt). */
export const KEEP_AWAKE_GRACE_MS = 10 * 60_000

/** A session keeps the computer awake while it works or waits for an answer from the phone. */
export function isActive(sessions: readonly { state: SessionState }[]): boolean {
  return sessions.some((session) => session.state === 'running' || session.state === 'waiting')
}

export type KeepAwakeDecision = {
  hold: boolean
  /** Evaluate again after this long (end of the grace period); null when nothing is pending. */
  recheckInMs: number | null
}

/** Whether to hold the sleep assertion now. `lastActiveAt` is the last time a session was active. */
export function keepAwakeDecision(o: {
  mode: KeepAwakeMode
  active: boolean
  lastActiveAt: number | null
  now: number
  graceMs?: number
}): KeepAwakeDecision {
  if (o.mode === 'off') return { hold: false, recheckInMs: null }
  if (o.mode === 'always' || o.active) return { hold: true, recheckInMs: null }
  if (o.lastActiveAt === null) return { hold: false, recheckInMs: null }
  const left = o.lastActiveAt + (o.graceMs ?? KEEP_AWAKE_GRACE_MS) - o.now
  return left > 0 ? { hold: true, recheckInMs: left } : { hold: false, recheckInMs: null }
}
