import { existsSync, readFileSync } from 'node:fs'
import type { Logger } from '../../core/logger.ts'

export type PushMessage = {
  title: string
  body: string
  /** Only identifiers: never prompts, commands or paths. */
  data: Record<string, string>
  category?: string
}

export interface PushSender {
  /** Sends to every token and returns the tokens FCM reported as invalid. */
  send(tokens: readonly string[], message: PushMessage): Promise<{ invalidTokens: string[] }>
}

/** Android notification channel created by the app at startup (high importance). */
export const ANDROID_CHANNEL_ID = 'claude-remote'

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
    logger.warn(
      { path: serviceAccountPath },
      'Firebase service account not found: push notifications disabled',
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
    async send(tokens, message) {
      if (tokens.length === 0) return { invalidTokens: [] }
      const response = await messaging.sendEachForMulticast(buildMulticast(tokens, message))
      const invalidTokens = response.responses.flatMap((r, i) =>
        !r.success && r.error && INVALID.has(r.error.code) ? [tokens[i]!] : [],
      )
      return { invalidTokens }
    },
  }
}
