import type { DevicePlatform, PushRelay } from '@remote-harness/protocol'
import type { Messages } from '../../core/i18n/index.ts'
import type { Logger } from '../../core/logger.ts'
import type { PushSender } from '../push/sender.ts'
import {
  DONE_DISMISS_MS,
  initialLiveStatus,
  isFinal,
  type LiveEvent,
  type LiveSessionInfo,
  type LiveStatus,
  liveProps,
  planSend,
  reduceLiveStatus,
  STALE_AFTER_MS,
} from './status.ts'

export type LiveRegistration = {
  sessionId: string
  platform: DevicePlatform
  fcmToken: string
  activityToken?: string
  relay?: PushRelay
}

type Entry = LiveRegistration & {
  status: LiveStatus
  /** Last status sent, and when. */
  sent: LiveStatus | null
  lastSentAt: number | null
  timer: NodeJS.Timeout | null
  unfollow: (() => void) | null
}

export type LiveStatusOptions = {
  messages: Messages['live']
  /** Profile of a session (for mute), null when unknown. */
  profileOf: (sessionId: string) => string | null
  /** Names and folder shown with the status. */
  info: (sessionId: string, profileId: string | null) => LiveSessionInfo
  isMuted: (profileId: string | null, sessionId: string) => boolean
  /** Starts following the session's transcript; resolves with the function that stops it. */
  follow: (sessionId: string, onEvent: (event: LiveEvent) => void) => Promise<() => void>
  now?: () => number
}

/** Keeps the live status of registered sessions up to date through FCM. Registrations live in memory. */
export class LiveStatusService {
  private readonly entries = new Map<string, Entry>()
  private readonly now: () => number

  constructor(
    private readonly sender: PushSender | null,
    private readonly logger: Logger,
    private readonly options: LiveStatusOptions,
  ) {
    this.now = options.now ?? Date.now
  }

  has(sessionId: string): boolean {
    return this.entries.has(sessionId)
  }

  /** Registers (or replaces) the live status of a session and sends its current state. */
  async register(registration: LiveRegistration): Promise<void> {
    const previous = this.entries.get(registration.sessionId)
    if (previous?.timer) clearTimeout(previous.timer)
    const entry: Entry = {
      ...registration,
      // A new activity for a turn in progress keeps what is known about it.
      status: previous && !isFinal(previous.status) ? previous.status : initialLiveStatus(this.now()),
      sent: null,
      lastSentAt: null,
      timer: null,
      unfollow: previous?.unfollow ?? null,
    }
    this.entries.set(registration.sessionId, entry)
    if (!entry.unfollow) {
      entry.unfollow = await this.options
        .follow(registration.sessionId, (event) => this.handle(registration.sessionId, event))
        .catch((error: unknown) => {
          this.logger.warn(
            { err: error, sessionId: registration.sessionId },
            'live status: transcript not followed',
          )
          return null
        })
      // Unregistered while the transcript was being opened.
      if (this.entries.get(registration.sessionId) !== entry) entry.unfollow?.()
    }
    await this.flush(entry)
  }

  unregister(sessionId: string): void {
    const entry = this.entries.get(sessionId)
    if (!entry) return
    this.drop(entry)
  }

  /** Applies an event to a registered session and sends it now or later (throttle). */
  handle(sessionId: string, event: LiveEvent): void {
    const entry = this.entries.get(sessionId)
    if (!entry) return
    entry.status = reduceLiveStatus(entry.status, event, this.now())
    const plan = planSend(entry.sent, entry.status, entry.lastSentAt, this.now())
    if (plan.when === 'now') {
      void this.flush(entry)
    } else if (plan.when === 'later' && !entry.timer) {
      entry.timer = setTimeout(() => void this.flush(entry), plan.delayMs)
      entry.timer.unref?.()
    }
  }

  dispose(): void {
    for (const entry of [...this.entries.values()]) this.drop(entry)
  }

  private drop(entry: Entry): void {
    if (entry.timer) clearTimeout(entry.timer)
    entry.timer = null
    entry.unfollow?.()
    entry.unfollow = null
    if (this.entries.get(entry.sessionId) === entry) this.entries.delete(entry.sessionId)
  }

  private async flush(entry: Entry): Promise<void> {
    if (entry.timer) clearTimeout(entry.timer)
    entry.timer = null
    if (this.entries.get(entry.sessionId) !== entry) return
    const profileId = this.options.profileOf(entry.sessionId)
    const muted = this.options.isMuted(profileId, entry.sessionId)
    const now = this.now()
    const final = muted || isFinal(entry.status)
    entry.sent = entry.status
    entry.lastSentAt = now
    if (final) this.drop(entry)
    if (!this.sender) return
    try {
      const { invalid } = await this.sender.sendLive({
        sessionId: entry.sessionId,
        platform: entry.platform,
        fcmToken: entry.fcmToken,
        ...(entry.activityToken ? { activityToken: entry.activityToken } : {}),
        ...(entry.relay ? { relay: entry.relay } : {}),
        props: liveProps(entry.status, this.options.info(entry.sessionId, profileId), this.options.messages),
        event: final ? 'end' : 'update',
        at: now,
        staleAt: now + STALE_AFTER_MS,
        // Muted: gone at once; done: stays a while on the lock screen.
        ...(final
          ? { dismissAt: !muted && entry.status.state === 'done' ? now + DONE_DISMISS_MS : now }
          : {}),
      })
      if (invalid) this.drop(entry)
    } catch (error) {
      this.logger.warn({ err: error, sessionId: entry.sessionId }, 'live status push failed')
    }
  }
}
