import { describe, expect, test } from 'vitest'
import { createGrantCache, type GrantFetch, pushRelayUrl, requestGrant } from './relay'

describe('pushRelayUrl', () => {
  test('only HTTPS URLs, without trailing slash', () => {
    expect(pushRelayUrl({ pushRelay: 'https://r.example/fn/' })).toBe('https://r.example/fn')
    expect(pushRelayUrl({ pushRelay: 'http://r.example' })).toBeNull()
    expect(pushRelayUrl({})).toBeNull()
    expect(pushRelayUrl(undefined)).toBeNull()
  })
})

describe('requestGrant', () => {
  const request = { fcmToken: 'fcm', platform: 'ios' as const, activityToken: 'act' }

  test('posts the tokens with the App Check header and returns the relay data', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const fetchImpl: GrantFetch = async (url, init) => {
      calls.push({ url, init })
      return { ok: true, json: async () => ({ grant: 'sealed' }) }
    }
    expect(await requestGrant('https://r.example/fn', request, 'ac', fetchImpl)).toEqual({
      url: 'https://r.example/fn',
      grant: 'sealed',
    })
    expect(calls[0]?.url).toBe('https://r.example/fn/grant')
    expect(calls[0]?.init.headers).toMatchObject({ 'x-firebase-appcheck': 'ac' })
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual(request)
  })

  test('refusals and network errors give null', async () => {
    expect(
      await requestGrant('https://r', request, null, async () => ({ ok: false, json: async () => ({}) })),
    ).toBeNull()
    expect(
      await requestGrant('https://r', request, null, async () => {
        throw new Error('offline')
      }),
    ).toBeNull()
  })
})

describe('createGrantCache', () => {
  test('keys by platform and tokens', () => {
    const cache = createGrantCache()
    const relay = { url: 'https://r', grant: 'g' }
    cache.set({ fcmToken: 'a', platform: 'ios' }, relay)
    expect(cache.get({ fcmToken: 'a', platform: 'ios' })).toBe(relay)
    expect(cache.get({ fcmToken: 'a', platform: 'ios', activityToken: 'x' })).toBeUndefined()
  })
})
