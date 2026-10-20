import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { LiveFollowDevice } from '@remote-harness/protocol'
import { afterEach, describe, expect, test } from 'vitest'
import { messagesFor } from '../src/core/i18n/index.ts'
import { silentLogger } from '../src/core/logger.ts'
import {
  addFollow,
  autoFollowersOf,
  dropExpired,
  dropSession,
  EMPTY_FOLLOWS,
  FOLLOW_IDLE_MS,
  FollowStore,
  followExpired,
  followedBy,
  followersOf,
  removeFollow,
  setAutoFollow,
  shouldStartFollowed,
  startPlan,
  touchSession,
  upsertDevice,
} from '../src/features/live-status/follows.ts'
import { LiveStatusService } from '../src/features/live-status/service.ts'
import { initialLiveStatus, liveProps } from '../src/features/live-status/status.ts'
import { buildLiveMessage, type LiveMessage, type PushSender } from '../src/features/push/sender.ts'

const iphone: LiveFollowDevice = { platform: 'ios', fcmToken: 'fcm-ios', startToken: 'start' }
const android: LiveFollowDevice = { platform: 'android', fcmToken: 'fcm-android', androidDataMessages: true }

describe('follow rules', () => {
  test('a follow expires after 12 hours without a turn', () => {
    expect(followExpired(0, FOLLOW_IDLE_MS - 1)).toBe(false)
    expect(followExpired(0, FOLLOW_IDLE_MS)).toBe(true)
  })

  test('the daemon starts a followed live status only when nothing else shows it', () => {
    const quiet = { registered: false, foreground: false, muted: false }
    expect(shouldStartFollowed(quiet)).toBe(true)
    expect(shouldStartFollowed({ ...quiet, registered: true })).toBe(false)
    expect(shouldStartFollowed({ ...quiet, foreground: true })).toBe(false)
    expect(shouldStartFollowed({ ...quiet, muted: true })).toBe(false)
  })

  test('each phone starts the way it can', () => {
    expect(startPlan(android)).toBe('android')
    expect(startPlan(iphone)).toBe('push-to-start')
    expect(startPlan({ platform: 'ios' })).toBe('push')
  })
})

describe('follow state', () => {
  test('follows are per phone, and refreshing a phone keeps what it follows', () => {
    let state = upsertDevice(upsertDevice(EMPTY_FOLLOWS, iphone), android)
    state = addFollow(state, iphone.fcmToken, 's1', 0)
    state = setAutoFollow(state, iphone.fcmToken, 'work', true)
    state = upsertDevice(state, { ...iphone, startToken: 'new-start' })
    expect(followedBy(state, iphone.fcmToken)).toEqual({ sessionIds: ['s1'], autoFollowProfiles: ['work'] })
    expect(followedBy(state, android.fcmToken)).toEqual({ sessionIds: [], autoFollowProfiles: [] })
    expect(followersOf(state, 's1', 0).map((d) => d.startToken)).toEqual(['new-start'])
    expect(autoFollowersOf(state, 'work').map((d) => d.fcmToken)).toEqual([iphone.fcmToken])
  })

  test('unfollow, auto-follow off and an ended session remove follows', () => {
    let state = addFollow(upsertDevice(EMPTY_FOLLOWS, iphone), iphone.fcmToken, 's1', 0)
    state = addFollow(state, iphone.fcmToken, 's2', 0)
    expect(followedBy(removeFollow(state, iphone.fcmToken, 's1'), iphone.fcmToken).sessionIds).toEqual(['s2'])
    expect(followedBy(dropSession(state, 's2'), iphone.fcmToken).sessionIds).toEqual(['s1'])
    const auto = setAutoFollow(state, iphone.fcmToken, 'work', true)
    expect(
      followedBy(setAutoFollow(auto, iphone.fcmToken, 'work', false), iphone.fcmToken).autoFollowProfiles,
    ).toEqual([])
  })

  test('a turn renews the follow; idle follows expire', () => {
    let state = addFollow(upsertDevice(EMPTY_FOLLOWS, iphone), iphone.fcmToken, 's1', 0)
    state = touchSession(state, 's1', FOLLOW_IDLE_MS - 1)
    expect(followersOf(state, 's1', FOLLOW_IDLE_MS + 10)).toHaveLength(1)
    expect(followedBy(dropExpired(state, 2 * FOLLOW_IDLE_MS), iphone.fcmToken).sessionIds).toEqual([])
    expect(followersOf(state, 's1', 2 * FOLLOW_IDLE_MS)).toEqual([])
  })
})

describe('FollowStore', () => {
  let dir = ''
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true })
  })

  test('saves follows and loads them back after a restart', async () => {
    dir = await mkdtemp(join(tmpdir(), 'follows-'))
    const path = join(dir, 'live-follows.json')
    const store = new FollowStore(path)
    await store.load()
    await store.update((state) => addFollow(upsertDevice(state, iphone), iphone.fcmToken, 's1', 5))
    const again = new FollowStore(path)
    await again.load()
    expect(followedBy(again.get(), iphone.fcmToken).sessionIds).toEqual(['s1'])
    expect(JSON.parse(await readFile(path, 'utf8')).devices[0].sessions).toEqual([
      { sessionId: 's1', lastTurnAt: 5 },
    ])
  })

  test('a broken file starts empty', async () => {
    dir = await mkdtemp(join(tmpdir(), 'follows-'))
    const store = new FollowStore(join(dir, 'missing.json'))
    await store.load()
    expect(store.get()).toEqual(EMPTY_FOLLOWS)
  })
})

describe('push-to-start', () => {
  const props = liveProps(
    initialLiveStatus(1_000),
    { title: 'Work', host: 'mac', session: 'Fix login', path: '~/app' },
    messagesFor('en-US').live,
  )

  test('a start push carries the activity type, its deep link and an alert', () => {
    const built = buildLiveMessage({
      sessionId: 's1',
      platform: 'ios',
      fcmToken: 'fcm',
      activityToken: 'start',
      props,
      event: 'start',
      at: 2_000,
      url: 'claude-remote://session/s1',
      alert: { title: 'Fix login', body: 'Working' },
    })
    expect(built.apns?.liveActivityToken).toBe('start')
    expect(built.apns?.headers['apns-priority']).toBe('10')
    const aps = built.apns?.payload.aps as Record<string, unknown>
    expect(aps.event).toBe('start')
    expect(aps['attributes-type']).toBe('LiveActivityAttributes')
    expect(aps.attributes).toEqual({ url: 'claude-remote://session/s1' })
    expect(aps.alert).toEqual({ title: 'Fix login', body: 'Working' })
  })

  test('updates carry no start fields', () => {
    const built = buildLiveMessage({
      sessionId: 's1',
      platform: 'ios',
      fcmToken: 'fcm',
      activityToken: 'act',
      props,
      event: 'update',
      at: 2_000,
    })
    const aps = built.apns?.payload.aps as Record<string, unknown>
    expect(aps['attributes-type']).toBeUndefined()
    expect(aps.alert).toBeUndefined()
  })

  test('the service sends the start, then waits for the app to register the activity', async () => {
    const sent: LiveMessage[] = []
    const sender: PushSender = {
      async send() {
        return { invalidTokens: [] }
      },
      async sendLive(message) {
        sent.push(message)
        return { invalid: false }
      },
    }
    const service = new LiveStatusService(sender, silentLogger, {
      messages: messagesFor('en-US').live,
      profileOf: () => 'p1',
      info: () => ({ title: 'Work', host: 'mac', session: 'Fix login', path: '~/app' }),
      isMuted: () => false,
      follow: async () => () => undefined,
      now: () => 1_000,
    })
    await service.startByPush(
      { sessionId: 's1', platform: 'ios', fcmToken: 'fcm' },
      {
        startToken: 'start',
        url: 'claude-remote://session/s1',
        alert: { title: 'Fix login', body: 'Working' },
      },
    )
    expect(sent.map((m) => [m.event, m.activityToken])).toEqual([['start', 'start']])
    // Updates of the turn wait for the activity's own token...
    service.handle('s1', { type: 'waiting', permission: true })
    expect(sent).toHaveLength(1)
    // ...which the app sends once it adopts the activity: the turn's status goes out with it.
    await service.register({ sessionId: 's1', platform: 'ios', fcmToken: 'fcm', activityToken: 'act' })
    expect(sent.at(-1)).toMatchObject({ event: 'update', activityToken: 'act', props: { state: 'waiting' } })
    service.dispose()
  })
})
