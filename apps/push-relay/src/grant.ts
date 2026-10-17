import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { z } from 'zod'

export const PlatformSchema = z.enum(['ios', 'android'])

/** What a grant seals: the phone's FCM token and, for a Live Activity, its push token. */
export const GrantPayloadSchema = z.object({
  v: z.literal(1),
  t: z.string().min(1).max(4096),
  p: PlatformSchema,
  a: z.string().min(1).max(4096).optional(),
  /** Issued at, epoch seconds. */
  iat: z.number().int(),
})
export type GrantPayload = z.infer<typeof GrantPayloadSchema>

const IV_BYTES = 12
const TAG_BYTES = 16

/** 32-byte AES key from the `GRANT_KEY` secret (base64 or hex). */
export function parseGrantKey(secret: string): Buffer {
  const trimmed = secret.trim()
  const key = /^[0-9a-f]{64}$/i.test(trimmed) ? Buffer.from(trimmed, 'hex') : Buffer.from(trimmed, 'base64')
  if (key.length !== 32) throw new Error('GRANT_KEY must be 32 bytes (64 hex chars or base64)')
  return key
}

/** `base64url(iv | ciphertext | tag)` of the payload under AES-256-GCM. */
export function sealGrant(key: Buffer, payload: GrantPayload, iv: Buffer = randomBytes(IV_BYTES)): string {
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  return Buffer.concat([iv, body, cipher.getAuthTag()]).toString('base64url')
}

/** The payload of a grant sealed with `key`, or null when it was tampered with or is not a grant. */
export function openGrant(key: Buffer, grant: string): GrantPayload | null {
  try {
    const raw = Buffer.from(grant, 'base64url')
    if (raw.length <= IV_BYTES + TAG_BYTES) return null
    const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, IV_BYTES))
    decipher.setAuthTag(raw.subarray(raw.length - TAG_BYTES))
    const text = Buffer.concat([
      decipher.update(raw.subarray(IV_BYTES, raw.length - TAG_BYTES)),
      decipher.final(),
    ]).toString('utf8')
    const parsed = GrantPayloadSchema.safeParse(JSON.parse(text))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
