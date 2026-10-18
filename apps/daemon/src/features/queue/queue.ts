import type { QueuedMessage, SessionState } from '@remote-harness/protocol'

/** Pause after a session turns idle before pasting, so the TUI prompt is back on screen. */
export const QUEUE_SETTLE_MS = 600
/** After a delivery, how long the session may stay `idle` before the next prompt is allowed anyway. */
export const TURN_GRACE_MS = 15_000

export type QueueSession = { state: SessionState; controllable: boolean }

/** A session that cannot take a prompt right now: working, waiting, or blocked on a permission. */
export function isBusy(session: QueueSession, hasPending: boolean): boolean {
  return hasPending || session.state === 'running' || session.state === 'waiting'
}

/** The next prompt to deliver on its own: the head, unless it failed and waits for the user. */
export function nextDeliverable(items: readonly QueuedMessage[]): QueuedMessage | null {
  const head = items[0]
  return head && head.error === null ? head : null
}

/**
 * Whether the daemon may paste a queued prompt now: the session is idle and controllable, no
 * permission is pending, and the previous delivery either registered (the session left idle) or
 * is older than the grace period.
 */
export function canDeliver(
  session: QueueSession | undefined,
  hasPending: boolean,
  lastDeliveredAt: number | undefined,
  now: number,
): boolean {
  if (!session?.controllable || session.state !== 'idle' || hasPending) return false
  return lastDeliveredAt === undefined || now - lastDeliveredAt >= TURN_GRACE_MS
}
