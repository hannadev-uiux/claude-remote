import type { PermissionOutcome, PermissionRequestInfo } from '@remote-harness/protocol'
import type { HookEvent } from '../features/hooks/payloads.ts'

/** Domain events exchanged between features through the bus. Grows as features are added. */
export type DaemonEvents = {
  'token.rotated': { token: string }
  hook: HookEvent
  'permission.requested': PermissionRequestInfo
  'permission.resolved': { info: PermissionRequestInfo; outcome: PermissionOutcome }
  /** The hook stopped waiting; the request is answered in the terminal until the session moves on. */
  'permission.handover': PermissionRequestInfo
  /** A question or plan is still open after a while. */
  'permission.reminder': PermissionRequestInfo
}
