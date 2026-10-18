import type { Session } from '@remote-harness/protocol'

/**
 * Whether Send would hold the prompt (mode `auto` on the daemon) instead of pasting it: the agent
 * is working or waiting, a permission is pending, or prompts are already queued.
 */
export function willQueue(
  session: Pick<Session, 'state'> | undefined,
  pendingPermissions: number,
  queued: number,
): boolean {
  if (!session) return false
  return pendingPermissions > 0 || queued > 0 || session.state === 'running' || session.state === 'waiting'
}
