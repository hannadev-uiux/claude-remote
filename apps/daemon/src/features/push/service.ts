import type { PermissionRequestInfo, Profile, PushMode, PushTestResult } from '@remote-harness/protocol'
import type { Messages } from '../../core/i18n/index.ts'
import type { Logger } from '../../core/logger.ts'
import type { HookEvent } from '../hooks/payloads.ts'
import type { DeviceRegistry } from './devices.ts'
import type { PushMessage, PushSender } from './sender.ts'

export const PERMISSION_CATEGORY = 'PERMISSION'

export type PushServiceOptions = {
  profiles: readonly Profile[]
  /** True when some app is connected and in the foreground: it shows the event itself. */
  hasForegroundClient: () => boolean
  isMuted: (profileId: string | null, sessionId: string) => boolean
  /** Texts in the configured language. Only titles: the body is the profile name. */
  messages: Messages['push']
  /** Current push mode (tests answer `off` instead of trying). */
  mode: () => PushMode
  /** Name of this computer, the body of test pushes. */
  host: string
}

/** Decides which events become a push and builds content-free payloads. */
export class PushService {
  constructor(
    private readonly sender: PushSender | null,
    private readonly devices: DeviceRegistry,
    private readonly logger: Logger,
    private readonly options: PushServiceOptions,
  ) {}

  private profileName(profileId: string | null): string {
    return this.options.profiles.find((p) => p.id === profileId)?.name ?? profileId ?? 'Claude'
  }

  messageForHook(hook: HookEvent): PushMessage | null {
    const sessionId = hook.payload.session_id
    const base = { sessionId, profileId: hook.profileId ?? '', event: hook.event }
    if (hook.event === 'Stop') {
      return { title: this.options.messages.sessionDone, body: this.profileName(hook.profileId), data: base }
    }
    if (hook.event === 'Notification') {
      const type = hook.payload.notification_type
      // permission prompts are announced by the PermissionRequest flow (with actions).
      if (type === 'permission_prompt' || type === 'auth_success') return null
      return {
        title: this.options.messages.sessionWaiting,
        body: this.profileName(hook.profileId),
        data: base,
      }
    }
    return null
  }

  messageForPermission(info: PermissionRequestInfo): PushMessage {
    const { messages } = this.options
    const kind = info.interaction?.kind
    return {
      title:
        kind === 'question'
          ? messages.questionPending
          : kind === 'plan'
            ? messages.planPending
            : messages.permissionPending,
      body: this.profileName(info.profileId),
      data: {
        sessionId: info.sessionId,
        profileId: info.profileId,
        event: 'PermissionRequest',
        requestId: info.requestId,
      },
      // Questions and plans are answered in the app: no one-tap Allow/Deny.
      ...(kind ? {} : { category: PERMISSION_CATEGORY }),
    }
  }

  testMessage(): PushMessage {
    return {
      title: this.options.messages.testTitle,
      body: this.options.messages.testBody(this.options.host),
      data: { event: 'test' },
    }
  }

  /**
   * Test push asked by the user: to the given phone only (every phone without one), even with the
   * app in the foreground or muted.
   */
  async sendTest(token?: string): Promise<{ result: PushTestResult; sent: number }> {
    if (!this.sender || this.options.mode() === 'off') return { result: 'off', sent: 0 }
    const devices = this.devices.devices().filter((d) => token === undefined || d.token === token)
    if (devices.length === 0) return { result: 'unregistered', sent: 0 }
    try {
      const { invalidTokens } = await this.sender.send(devices, this.testMessage())
      await this.devices.remove(invalidTokens)
      const sent = devices.length - invalidTokens.length
      return { result: sent > 0 ? 'sent' : 'failed', sent }
    } catch (error) {
      this.logger.warn({ err: error }, 'test push failed')
      return { result: 'failed', sent: 0 }
    }
  }

  async notify(message: PushMessage | null): Promise<boolean> {
    if (!message || !this.sender) return false
    const sessionId = message.data.sessionId ?? ''
    if (this.options.hasForegroundClient()) return false
    if (this.options.isMuted(message.data.profileId || null, sessionId)) return false
    const devices = this.devices.devices()
    if (devices.length === 0) return false
    try {
      const { invalidTokens } = await this.sender.send(devices, message)
      await this.devices.remove(invalidTokens)
      return true
    } catch (error) {
      this.logger.warn({ err: error }, 'push failed')
      return false
    }
  }
}
