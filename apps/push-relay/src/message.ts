import { z } from 'zod'
import type { GrantPayload } from './grant.ts'

/** Largest FCM message accepted from a daemon (serialized). */
export const MAX_MESSAGE_BYTES = 8 * 1024

const MessageSchema = z.strictObject({
  data: z.record(z.string(), z.string()).optional(),
  notification: z.strictObject({ title: z.string().optional(), body: z.string().optional() }).optional(),
  apns: z.record(z.string(), z.unknown()).optional(),
  android: z.record(z.string(), z.unknown()).optional(),
  // Ignored: the relay sets the target from the grant.
  token: z.string().optional(),
})

export type TargetedMessage = {
  token: string
  data?: Record<string, string>
  notification?: { title?: string; body?: string }
  apns?: Record<string, unknown>
  android?: Record<string, unknown>
}

export type TargetResult = { ok: true; message: TargetedMessage } | { ok: false; reason: string }

/**
 * Points a daemon's FCM message at the phone in the grant. Anything that picks another target
 * (`topic`, `condition`, `tokens`, a foreign `liveActivityToken`) is rejected or replaced.
 */
export function targetMessage(input: unknown, grant: GrantPayload): TargetResult {
  if (JSON.stringify(input ?? null).length > MAX_MESSAGE_BYTES)
    return { ok: false, reason: 'message too large' }
  const parsed = MessageSchema.safeParse(input)
  if (!parsed.success) return { ok: false, reason: parsed.error.issues[0]?.message ?? 'invalid message' }
  const { token: _ignored, apns, ...rest } = parsed.data
  const message: TargetedMessage = { ...rest, token: grant.t }
  if (apns) {
    const { liveActivityToken: _foreign, ...apnsRest } = apns
    message.apns = grant.a ? { ...apnsRest, liveActivityToken: grant.a } : apnsRest
  }
  return { ok: true, message }
}
