import { createHash } from 'node:crypto'
import { z } from 'zod'
import { openGrant, PlatformSchema, sealGrant } from './grant.ts'
import { type TargetedMessage, targetMessage } from './message.ts'
import type { RateLimiter } from './rate-limit.ts'

export type RelayRequest = {
  method: string
  path: string
  header: (name: string) => string | undefined
  body: unknown
}
export type RelayResponse = { status: number; body: Record<string, unknown> }

export type AppCheckMode = 'enforce' | 'monitor'

export type RelayDeps = {
  key: Buffer
  appCheck: AppCheckMode
  /** True when the App Check token is valid. */
  verifyAppCheck: (token: string) => Promise<boolean>
  /** Sends through FCM; rejects with the FCM error (with `code`) on failure. */
  send: (message: TargetedMessage) => Promise<void>
  limiter: RateLimiter
  now: () => number
  warn: (message: string, details?: Record<string, unknown>) => void
}

const GrantRequestSchema = z.object({
  fcmToken: z.string().min(1).max(4096),
  platform: PlatformSchema,
  activityToken: z.string().min(1).max(4096).optional(),
})
const SendRequestSchema = z.object({ grant: z.string().min(1).max(16_384), message: z.unknown() })

const UNREGISTERED = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
])

const reply = (status: number, body: Record<string, unknown>): RelayResponse => ({ status, body })

/** Routes `POST /grant` (app) and `POST /send` (daemon). */
export function createRelayHandler(deps: RelayDeps) {
  async function grant(req: RelayRequest): Promise<RelayResponse> {
    const token = req.header('x-firebase-appcheck')
    const valid = token ? await deps.verifyAppCheck(token).catch(() => false) : false
    if (!valid) {
      if (deps.appCheck === 'enforce') return reply(401, { error: 'app_check' })
      deps.warn('grant without a valid App Check token', { hasToken: Boolean(token) })
    }
    const parsed = GrantRequestSchema.safeParse(req.body)
    if (!parsed.success) return reply(400, { error: 'bad_request' })
    const { fcmToken, platform, activityToken } = parsed.data
    const sealed = sealGrant(deps.key, {
      v: 1,
      t: fcmToken,
      p: platform,
      ...(activityToken ? { a: activityToken } : {}),
      iat: Math.floor(deps.now() / 1000),
    })
    return reply(200, { grant: sealed })
  }

  async function send(req: RelayRequest): Promise<RelayResponse> {
    const parsed = SendRequestSchema.safeParse(req.body)
    if (!parsed.success) return reply(400, { error: 'bad_request' })
    const payload = openGrant(deps.key, parsed.data.grant)
    if (!payload) return reply(403, { error: 'invalid_grant' })
    const bucket = createHash('sha256').update(parsed.data.grant).digest('base64url')
    if (!deps.limiter.take(bucket, deps.now())) return reply(429, { error: 'rate_limited' })
    const targeted = targetMessage(parsed.data.message, payload)
    if (!targeted.ok) return reply(400, { error: 'bad_message', reason: targeted.reason })
    try {
      await deps.send(targeted.message)
      return reply(200, { ok: true })
    } catch (error) {
      const code = (error as { code?: unknown }).code
      if (typeof code === 'string' && UNREGISTERED.has(code)) return reply(410, { error: 'unregistered' })
      deps.warn('FCM send failed', { code: typeof code === 'string' ? code : undefined })
      return reply(502, { error: 'fcm_failed' })
    }
  }

  return async (req: RelayRequest): Promise<RelayResponse> => {
    if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' })
    const path = req.path.replace(/\/+$/, '')
    if (path.endsWith('/grant')) return grant(req)
    if (path.endsWith('/send')) return send(req)
    return reply(404, { error: 'not_found' })
  }
}
