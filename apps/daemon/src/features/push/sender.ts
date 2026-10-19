import { existsSync, readFileSync } from 'node:fs'
import {
  type DevicePlatform,
  LIVE_ACTIVITY_NAME,
  type LiveStatusProps,
  type PushRelay,
} from '@remote-harness/protocol'
import type { Logger } from '../../core/logger.ts'

export type PushMessage = {
  title: string
  body: string
  /** Only identifiers: never prompts, commands or paths. */
  data: Record<string, string>
  category?: string
}

/** One live status update for one phone (Live Activity on iOS, tagged notification on Android). */
export type LiveMessage = {
  sessionId: string
  platform: DevicePlatform
  fcmToken: string
  /** iOS Live Activity push token. */
  activityToken?: string
  /** Relay grant (it seals the FCM and activity tokens) for daemons without a service account. */
  relay?: PushRelay
  props: LiveStatusProps
  /** `end` closes the activity (iOS) / leaves a dismissable notification (Android). */
  event: 'update' | 'end'
  /** Epoch ms of this update. */
  at: number
  /** Epoch ms when iOS removes an ended activity; absent = right away. */
  dismissAt?: number
  /** Epoch ms after which iOS shows the activity as stale. */
  staleAt?: number
}

/** A registered phone: its FCM token and, when the app has one, its push relay grant. */
export type PushTarget = { token: string; relay?: PushRelay }

export interface PushSender {
  /** Sends to every phone and returns the tokens FCM reported as invalid. */
  send(targets: readonly PushTarget[], message: PushMessage): Promise<{ invalidTokens: string[] }>
  /** Sends a live status update; `invalid` when FCM says the token is gone. */
  sendLive(message: LiveMessage): Promise<{ invalid: boolean }>
}

/** Android notification channel created by the app at startup (high importance). */
export const ANDROID_CHANNEL_ID = 'claude-remote'
/** Low-importance channel of the live status notifications (no sound, no heads-up). */
export const ANDROID_LIVE_CHANNEL_ID = 'live-status'

const seconds = (ms: number) => Math.floor(ms / 1000)

/**
 * FCM message for a live status. iOS: an ActivityKit push through `apns.liveActivityToken`, whose
 * `content-state` is what `expo-widgets` expects (`name` + props as a JSON string). Android: a
 * notification with a per-session tag, so each update replaces the previous one.
 */
export function buildLiveMessage(message: LiveMessage) {
  const { props } = message
  const data = { sessionId: message.sessionId, event: 'live' }
  if (message.platform === 'ios') {
    return {
      token: message.fcmToken,
      data,
      apns: {
        ...(message.activityToken ? { liveActivityToken: message.activityToken } : {}),
        headers: { 'apns-priority': props.state === 'working' && message.event === 'update' ? '5' : '10' },
        payload: {
          aps: {
            timestamp: seconds(message.at),
            event: message.event,
            'content-state': { name: LIVE_ACTIVITY_NAME, props: JSON.stringify(props) },
            ...(message.staleAt !== undefined ? { 'stale-date': seconds(message.staleAt) } : {}),
            ...(message.event === 'end'
              ? { 'dismissal-date': seconds(message.dismissAt ?? message.at) }
              : {}),
          },
        },
      },
    }
  }
  // Android has no activity: the body carries the state line and the glyph row (oldest → newest).
  const glyphs = [...(props.glyphs ?? [])].reverse().join(' ')
  const details = [props.step, props.tools, props.tasks, glyphs].filter(Boolean).join(' · ')
  return {
    token: message.fcmToken,
    data,
    android: {
      priority: 'normal' as const,
      notification: {
        tag: `live-${message.sessionId}`,
        channelId: ANDROID_LIVE_CHANNEL_ID,
        title: `${props.session || props.title} · ${props.status}`,
        body: details || props.status,
        // A finished turn can be swiped away while it waits for the next one.
        sticky: message.event === 'update' && props.state !== 'done',
        notificationPriority: 'PRIORITY_LOW' as const,
        defaultSound: false,
      },
    },
  }
}

/**
 * FCM multicast payload. Both platform blocks go in every message: FCM applies `apns` to iPhones
 * and `android` to Android phones. Only the title, body and identifiers travel (no session content).
 */
export function buildMulticast(tokens: readonly string[], message: PushMessage) {
  return {
    tokens: [...tokens],
    notification: { title: message.title, body: message.body },
    data: message.data,
    apns: {
      payload: { aps: { sound: 'default', ...(message.category ? { category: message.category } : {}) } },
    },
    android: {
      priority: 'high' as const,
      notification: { channelId: ANDROID_CHANNEL_ID, sound: 'default' },
    },
  }
}

const INVALID = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
])

/** firebase-admin is loaded lazily and only when a service account file exists. */
export async function createFirebaseSender(
  serviceAccountPath: string,
  logger: Logger,
): Promise<PushSender | null> {
  if (!existsSync(serviceAccountPath)) {
    logger.info(
      { path: serviceAccountPath },
      'Firebase service account not found: pushes go through the push relay of the app builds that have one',
    )
    return null
  }
  const { cert, initializeApp } = await import('firebase-admin/app')
  const { getMessaging } = await import('firebase-admin/messaging')
  const app = initializeApp(
    { credential: cert(JSON.parse(readFileSync(serviceAccountPath, 'utf8'))) },
    'claude-remote',
  )
  const messaging = getMessaging(app)
  return {
    async send(targets, message) {
      const tokens = targets.map((t) => t.token)
      if (tokens.length === 0) return { invalidTokens: [] }
      const response = await messaging.sendEachForMulticast(buildMulticast(tokens, message))
      const invalidTokens = response.responses.flatMap((r, i) =>
        !r.success && r.error && INVALID.has(r.error.code) ? [tokens[i]!] : [],
      )
      return { invalidTokens }
    },
    async sendLive(message) {
      try {
        await messaging.send(buildLiveMessage(message))
        return { invalid: false }
      } catch (error) {
        const code = (error as { code?: string }).code
        if (code && INVALID.has(code)) return { invalid: true }
        throw error
      }
    },
  }
}
