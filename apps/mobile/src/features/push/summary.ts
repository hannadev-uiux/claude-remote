import type { PushMode } from '@remote-harness/protocol'
import type { PhonePush } from './push-state'

/** Why pushes cannot reach this phone, in the order the user should fix them; null when ready. */
export type PushIssue =
  | 'noFirebase'
  | 'permissionDenied'
  | 'daemonOff'
  | 'notRegistered'
  | 'noRelay'
  | 'relayFailed'

export function pushIssue(daemonMode: PushMode | null, phone: PhonePush): PushIssue | null {
  if (!phone.firebase) return 'noFirebase'
  if (phone.permission === 'denied') return 'permissionDenied'
  if (daemonMode === 'off') return 'daemonOff'
  if (!phone.token) return 'notRegistered'
  // Without a service account the daemon can only reach phones that registered with a relay grant.
  if (daemonMode === 'relay' && !phone.relay) return phone.relayConfigured ? 'relayFailed' : 'noRelay'
  return null
}

/** The test needs a daemon that knows `push.test` (it reports its mode) and a registered token. */
export function canTestPush(daemonMode: PushMode | null, phone: PhonePush): boolean {
  return daemonMode !== null && daemonMode !== 'off' && phone.token !== null
}
