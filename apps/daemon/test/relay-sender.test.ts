import { LiveStatusPropsSchema } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { silentLogger } from '../src/core/logger.ts'
import { createRelaySender, type RelayFetch, relaySendUrl } from '../src/features/push/relay-sender.ts'

const relay = (grant: string) => ({ url: 'https://relay.example/pushRelay/', grant })

function fakeFetch(statusFor: (grant: string) => number | Error) {
  const calls: { url: string; body: { grant: string; message: Record<string, unknown> } }[] = []
  const fetchImpl: RelayFetch = async (url, init) => {
    const body = JSON.parse(String(init.body))
    calls.push({ url, body })
    const status = statusFor(body.grant)
    if (status instanceof Error) throw status
    return { status }
  }
  return { calls, fetchImpl }
}

const message = {
  title: 'Session finished',
  body: 'Work',
  data: { sessionId: 's', profileId: 'p', event: 'Stop' },
}

describe('relay sender', () => {
  test('posts each grant with a message that names no target', async () => {
    const { calls, fetchImpl } = fakeFetch(() => 200)
    const sender = createRelaySender(silentLogger, fetchImpl)
    const result = await sender.send(
      [{ token: 'a', relay: relay('ga') }, { token: 'no-relay' }, { token: 'b', relay: relay('gb') }],
      message,
    )
    expect(result).toEqual({ invalidTokens: [] })
    expect(calls.map((c) => [c.url, c.body.grant])).toEqual([
      ['https://relay.example/pushRelay/send', 'ga'],
      ['https://relay.example/pushRelay/send', 'gb'],
    ])
    expect(calls[0]?.body.message).not.toHaveProperty('tokens')
    expect(calls[0]?.body.message).toMatchObject({ notification: { title: 'Session finished' } })
  })

  test('410 drops the token; other failures and network errors do not', async () => {
    const { fetchImpl } = fakeFetch((grant) =>
      grant === 'gone' ? 410 : grant === 'down' ? new Error('net') : 502,
    )
    const sender = createRelaySender(silentLogger, fetchImpl)
    const result = await sender.send(
      [
        { token: 'x', relay: relay('gone') },
        { token: 'y', relay: relay('down') },
        { token: 'z', relay: relay('busy') },
      ],
      message,
    )
    expect(result).toEqual({ invalidTokens: ['x'] })
  })

  test('live updates go through the relay only when the registration has a grant', async () => {
    const { calls, fetchImpl } = fakeFetch(() => 410)
    const sender = createRelaySender(silentLogger, fetchImpl)
    const live = {
      sessionId: 's',
      platform: 'ios' as const,
      fcmToken: 'fcm',
      props: LiveStatusPropsSchema.parse({
        title: 'W',
        state: 'working',
        status: 'Working',
        step: '',
        tools: '',
        startedAt: 1,
      }),
      event: 'update' as const,
      at: 1000,
    }
    expect(await sender.sendLive(live)).toEqual({ invalid: false })
    expect(calls).toHaveLength(0)
    expect(await sender.sendLive({ ...live, relay: relay('g') })).toEqual({ invalid: true })
    expect(calls[0]?.body.message).not.toHaveProperty('token')
    expect(calls[0]?.body.message).toHaveProperty('apns')
  })

  test('send URL ignores trailing slashes', () => {
    expect(relaySendUrl({ url: 'https://r.example/fn//', grant: 'g' })).toBe('https://r.example/fn/send')
  })
})
