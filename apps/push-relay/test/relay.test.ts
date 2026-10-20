import { randomBytes } from 'node:crypto'
import { describe, expect, test } from 'vitest'
import { openGrant, parseGrantKey, sealGrant } from '../src/grant.ts'
import { createRelayHandler, type RelayDeps, type RelayRequest } from '../src/handler.ts'
import { MAX_MESSAGE_BYTES, type TargetedMessage, targetMessage } from '../src/message.ts'
import { RateLimiter } from '../src/rate-limit.ts'

const key = randomBytes(32)
const payload = { v: 1 as const, t: 'fcm-phone', p: 'ios' as const, a: 'activity', iat: 1 }

describe('grants', () => {
  test('seal and open round-trip without revealing the token', () => {
    const grant = sealGrant(key, payload)
    expect(grant).not.toContain('fcm-phone')
    expect(Buffer.from(grant, 'base64url').toString('utf8')).not.toContain('fcm-phone')
    expect(openGrant(key, grant)).toEqual(payload)
  })

  test('tampered grants, other keys and garbage are rejected', () => {
    const grant = sealGrant(key, payload)
    const raw = Buffer.from(grant, 'base64url')
    raw[20] = (raw[20] ?? 0) ^ 1
    expect(openGrant(key, raw.toString('base64url'))).toBeNull()
    expect(openGrant(randomBytes(32), grant)).toBeNull()
    expect(openGrant(key, 'nope')).toBeNull()
  })

  test('keys parse from hex or base64 and must be 32 bytes', () => {
    expect(parseGrantKey(key.toString('hex'))).toEqual(key)
    expect(parseGrantKey(`${key.toString('base64')}\n`)).toEqual(key)
    expect(() => parseGrantKey('short')).toThrow(/32 bytes/)
  })
})

describe('targetMessage', () => {
  test('the grant picks the token and the Live Activity token', () => {
    const result = targetMessage(
      {
        token: 'someone-else',
        data: { sessionId: 's' },
        apns: { liveActivityToken: 'foreign', payload: { aps: { event: 'update' } } },
      },
      payload,
    )
    expect(result).toEqual({
      ok: true,
      message: {
        token: 'fcm-phone',
        data: { sessionId: 's' },
        apns: { liveActivityToken: 'activity', payload: { aps: { event: 'update' } } },
      },
    })
    const plain = targetMessage({ apns: { liveActivityToken: 'foreign' } }, { ...payload, a: undefined })
    expect(plain.ok && plain.message.apns).toEqual({})
  })

  test('an Android live status data message (no notification block) passes', () => {
    const message = {
      data: { sessionId: 's', event: 'live', live: '{"event":"update","props":{}}' },
      android: { priority: 'high', collapseKey: 'live-s' },
    }
    expect(targetMessage(message, { ...payload, p: 'android', a: undefined })).toEqual({
      ok: true,
      message: { ...message, token: 'fcm-phone' },
    })
  })

  test('messages that pick their own target or are too large are rejected', () => {
    expect(targetMessage({ topic: 'all' }, payload).ok).toBe(false)
    expect(targetMessage({ condition: "'a' in topics" }, payload).ok).toBe(false)
    expect(targetMessage({ tokens: ['x'] }, payload).ok).toBe(false)
    expect(targetMessage({ data: { big: 'x'.repeat(MAX_MESSAGE_BYTES) } }, payload)).toEqual({
      ok: false,
      reason: 'message too large',
    })
  })
})

describe('RateLimiter', () => {
  test('allows a burst, then refills over time', () => {
    const limiter = new RateLimiter(2, 1 / 1000)
    expect([limiter.take('k', 0), limiter.take('k', 0), limiter.take('k', 0)]).toEqual([true, true, false])
    expect(limiter.take('other', 0)).toBe(true)
    expect(limiter.take('k', 1000)).toBe(true)
  })
})

describe('relay handler', () => {
  function setup(overrides: Partial<RelayDeps> = {}) {
    const sent: TargetedMessage[] = []
    const warnings: string[] = []
    const handle = createRelayHandler({
      key,
      appCheck: 'monitor',
      verifyAppCheck: async (token) => token === 'valid',
      send: async (message) => {
        sent.push(message)
      },
      limiter: new RateLimiter(),
      now: () => 5_000,
      warn: (message) => warnings.push(message),
      ...overrides,
    })
    const request = (path: string, body: unknown, headers: Record<string, string> = {}): RelayRequest => ({
      method: 'POST',
      path,
      header: (name) => headers[name.toLowerCase()],
      body,
    })
    return { handle, sent, warnings, request }
  }

  test('grant then send reaches only the granted phone', async () => {
    const { handle, sent, request } = setup()
    const granted = await handle(
      request('/grant', { fcmToken: 'fcm-phone', platform: 'android' }, { 'x-firebase-appcheck': 'valid' }),
    )
    expect(granted.status).toBe(200)
    const grant = granted.body.grant as string
    const res = await handle(request('/send', { grant, message: { token: 'victim', data: { a: 'b' } } }))
    expect(res).toEqual({ status: 200, body: { ok: true } })
    expect(sent).toEqual([{ token: 'fcm-phone', data: { a: 'b' } }])
  })

  test('App Check: enforced rejects, monitor logs and allows', async () => {
    const enforced = setup({ appCheck: 'enforce' })
    const body = { fcmToken: 't', platform: 'ios' }
    expect((await enforced.handle(enforced.request('/grant', body))).status).toBe(401)
    expect(
      (await enforced.handle(enforced.request('/grant', body, { 'x-firebase-appcheck': 'forged' }))).status,
    ).toBe(401)
    const monitor = setup()
    expect((await monitor.handle(monitor.request('/grant', body))).status).toBe(200)
    expect(monitor.warnings).toHaveLength(1)
  })

  test('invalid grants, bad bodies, rate limits and gone tokens', async () => {
    const gone = Object.assign(new Error('gone'), { code: 'messaging/registration-token-not-registered' })
    const { handle, request } = setup({
      limiter: new RateLimiter(1, 0),
      send: async () => {
        throw gone
      },
    })
    const grant = sealGrant(key, payload)
    expect((await handle(request('/send', { grant: 'forged', message: {} }))).status).toBe(403)
    expect((await handle(request('/send', { message: {} }))).status).toBe(400)
    expect((await handle(request('/send', { grant, message: {} }))).status).toBe(410)
    expect((await handle(request('/send', { grant, message: {} }))).status).toBe(429)
    expect((await handle({ ...request('/send', {}), method: 'GET' })).status).toBe(405)
    expect((await handle(request('/other', {}))).status).toBe(404)
  })

  test('other FCM failures answer 502', async () => {
    const { handle, request, warnings } = setup({
      send: async () => {
        throw Object.assign(new Error('x'), { code: 'messaging/internal-error' })
      },
    })
    const res = await handle(request('/pushRelay/send', { grant: sealGrant(key, payload), message: {} }))
    expect(res.status).toBe(502)
    expect(warnings).toEqual(['FCM send failed'])
  })
})
