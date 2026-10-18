import type { PushMode } from '@remote-harness/protocol'
import type { LiveMessage, PushMessage, PushSender, PushTarget } from './sender.ts'

/** Config `push`: `auto` picks Firebase or the relay, `off` sends nothing. */
export type PushSetting = 'auto' | 'off'

/** A Firebase service account (the override) wins over the relay; `off` wins over both. */
export function resolvePushMode(o: { setting: PushSetting; hasServiceAccount: boolean }): PushMode {
  if (o.setting === 'off') return 'off'
  return o.hasServiceAccount ? 'firebase' : 'relay'
}

/**
 * The sender every feature holds: delegates to the current one, so switching push off (or back on)
 * applies to notifications and live status at once, without a restart.
 */
export class SwitchablePushSender implements PushSender {
  constructor(
    private inner: PushSender | null,
    private current: PushMode,
  ) {}

  get mode(): PushMode {
    return this.current
  }

  /** `null` (or mode `off`) sends nothing. */
  set(inner: PushSender | null, mode: PushMode): void {
    this.inner = mode === 'off' ? null : inner
    this.current = this.inner ? mode : 'off'
  }

  async send(targets: readonly PushTarget[], message: PushMessage): Promise<{ invalidTokens: string[] }> {
    return this.inner ? this.inner.send(targets, message) : { invalidTokens: [] }
  }

  async sendLive(message: LiveMessage): Promise<{ invalid: boolean }> {
    return this.inner ? this.inner.sendLive(message) : { invalid: false }
  }
}
