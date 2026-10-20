import type { SessionState } from '@remote-harness/protocol'

/** Notifications that do not mean the agent waits for the user. */
export const NOTIFICATIONS_NOT_WAITING = new Set(['auth_success', 'agent_completed'])

/** The state a hook moves a session to, or undefined when it does not change it. */
export function hookState(event: string, notificationType?: unknown): SessionState | undefined {
  switch (event) {
    case 'SessionStart':
    case 'Stop':
      return 'idle'
    case 'UserPromptSubmit':
      return 'running'
    case 'PermissionRequest':
      return 'waiting'
    case 'Notification':
      return typeof notificationType === 'string' && NOTIFICATIONS_NOT_WAITING.has(notificationType)
        ? undefined
        : 'waiting'
    case 'SessionEnd':
      return 'ended'
    default:
      return undefined
  }
}

/**
 * Hooks that bring an ended session back: a new start (resume, `/clear`), or a prompt typed in a tmux
 * pane (only a live session sends one).
 */
export function revives(event: string, hasPane: boolean): boolean {
  return event === 'SessionStart' || (event === 'UserPromptSubmit' && hasPane)
}

/**
 * Whether a hook may change the session's state, pane and controllability. An ended session ignores
 * late hooks (an idle notification or a `Stop` delivered after `SessionEnd`) until it is revived.
 */
export function acceptsHook(
  current: { state: SessionState } | undefined,
  event: string,
  hasPane: boolean,
): boolean {
  return current?.state !== 'ended' || revives(event, hasPane)
}

/** A resolved permission request means the agent works again, unless the session is gone or ended. */
export function stateAfterPermission(current: { state: SessionState } | undefined): SessionState | undefined {
  return current && current.state !== 'ended' ? 'running' : undefined
}

/** True when a change moved a session into `ended`. */
export function justEnded(
  next: { state: SessionState },
  previous: { state: SessionState } | undefined,
): boolean {
  return next.state === 'ended' && previous !== undefined && previous.state !== 'ended'
}
