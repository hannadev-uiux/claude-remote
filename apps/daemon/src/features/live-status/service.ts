import type { DevicePlatform, LivePalette, PushRelay } from '@remote-harness/protocol'
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
  /** App theme colors, echoed in every update so remote updates never reset the widget colors. */
  palette?: LivePalette
  /** Android: the app draws the notification from data messages. */
  androidDataMessages?: boolean
}

type Entry = LiveRegistration & {
  status: LiveStatus
  /** Last status sent, and when. */
  sent: LiveStatus | null
  lastSentAt: number | null
  timer: NodeJS.Timeout | null
  /** Ends a finished turn's activity once its window passes, unless a new turn comes first. */
  endTimer: NodeJS.Timeout | null
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
  /** Tasks the session runs in parallel right now (the count shown from the first update). */
  tasksOf?: (sessionId: string) => number
  now?: () => number
}

/**
 * Keeps the live status of registered sessions up to date through FCM. One registration per
 * session, in memory. A finished turn is an update ("done") that stays registered for
 * DONE_DISMISS_MS, so the next turn updates the same activity; only then, or when the session
 * closes or is muted, the activity ends.
 */
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
    // The activity of a turn in progress (or of a finished turn in its window) keeps what is known.
    const kept = previous && !isFinal(previous.status) ? previous.status : null
    const status = kept ?? initialLiveStatus(this.now())
    const entry: Entry = {
      ...registration,
      status: { ...status, tasks: this.options.tasksOf?.(registration.sessionId) ?? status.tasks },
      sent: null,
      lastSentAt: null,
      timer: null,
      endTimer: kept?.state === 'done' ? (previous?.endTimer ?? null) : null,
      unfollow: previous?.unfollow ?? null,
    }
    if (previous?.endTimer && !entry.endTimer) clearTimeout(previous.endTimer)
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
    if (entry.endTimer) clearTimeout(entry.endTimer)
    entry.timer = null
    entry.endTimer = null
    entry.unfollow?.()
    entry.unfollow = null
    if (this.entries.get(entry.sessionId) === entry) this.entries.delete(entry.sessionId)
  }

  /** Starts the done window once; a new turn (any other state) cancels it. */
  private trackDoneWindow(entry: Entry): void {
    if (entry.status.state !== 'done') {
      if (entry.endTimer) clearTimeout(entry.endTimer)
      entry.endTimer = null
      return
    }
    if (entry.endTimer) return
    const { sessionId } = entry
    entry.endTimer = setTimeout(() => void this.endDone(sessionId), DONE_DISMISS_MS)
    entry.endTimer.unref?.()
  }

  /** The done window passed without a new turn: the activity ends and the registration goes. */
  private async endDone(sessionId: string): Promise<void> {
    const entry = this.entries.get(sessionId)
    if (entry?.status.state !== 'done') return
    entry.endTimer = null
    this.drop(entry)
    await this.send(entry, 'end', this.now())
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
    else this.trackDoneWindow(entry)
    await this.send(entry, final ? 'end' : 'update', now)
  }

  /** One push to the registration; `end` dismisses at once (muted, closed or the done window over). */
  private async send(entry: Entry, event: 'update' | 'end', now: number): Promise<void> {
    if (!this.sender) return
    const profileId = this.options.profileOf(entry.sessionId)
    try {
      const { invalid } = await this.sender.sendLive({
        sessionId: entry.sessionId,
        platform: entry.platform,
        fcmToken: entry.fcmToken,
        ...(entry.activityToken ? { activityToken: entry.activityToken } : {}),
        ...(entry.relay ? { relay: entry.relay } : {}),
        ...(entry.androidDataMessages ? { androidDataMessages: true } : {}),
        props: {
          ...liveProps(entry.status, this.options.info(entry.sessionId, profileId), this.options.messages),
          ...(entry.palette ? { palette: entry.palette } : {}),
        },
        event,
        at: now,
        staleAt: now + STALE_AFTER_MS,
        ...(event === 'end' ? { dismissAt: now } : {}),
      })
      if (invalid) this.drop(entry)
    } catch (error) {
      this.logger.warn({ err: error, sessionId: entry.sessionId }, 'live status push failed')
    }
  }
}
