import type { PermissionOutcome, PermissionRequestInfo } from '@claude-remote/protocol'
import type { HookEvent } from '../features/hooks/payloads.ts'

/** Domain events exchanged between features through the bus. Grows as features are added. */
export type DaemonEvents = {
  'token.rotated': { token: string }
  hook: HookEvent
  'permission.requested': PermissionRequestInfo
  'permission.resolved': { info: PermissionRequestInfo; outcome: PermissionOutcome }
}
