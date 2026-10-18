import type { TranscriptEntry } from '@remote-harness/protocol'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { messagesFor } from '../src/core/i18n/index.ts'
import { silentLogger } from '../src/core/logger.ts'
import { hostName, shortenHome } from '../src/core/paths.ts'
import { LiveStatusService } from '../src/features/live-status/service.ts'
import {
  DONE_DISMISS_MS,
  initialLiveStatus,
  type LiveEvent,
  liveProps,
  planSend,
  reduceLiveStatus,
  STEP_INTERVAL_MS,
  stepForEntry,
  toolStep,
} from '../src/features/live-status/status.ts'
import { buildLiveMessage, type LiveMessage, type PushSender } from '../src/features/push/sender.ts'

const en = messagesFor('en-US').live
const pt = messagesFor('pt-BR').live

const base = { cursor: 1, index: 0, uuid: 'u', key: 'u:0', timestamp: null, isSidechain: false }

describe('live status reducer', () => {
  test('tools map to fixed categories', () => {
    expect(toolStep('Bash')).toBe('command')
    expect(toolStep('MultiEdit')).toBe('editing')
    expect(toolStep('Grep')).toBe('searching')
    expect(toolStep('mcp__github__create_issue')).toBe('tool')
  })

  test('transcript entries become steps, sidechains and user lines do not', () => {
    const use: TranscriptEntry = {
      ...base,
      kind: 'tool_use',
      toolUseId: 't',
      name: 'Bash',
      input: { command: 'rm -rf x' },
    }
    expect(stepForEntry(use)).toEqual({ type: 'step', step: 'command', tool: 'Bash' })
    expect(stepForEntry({ ...base, kind: 'thinking', text: 'secret' })).toEqual({
      type: 'step',
      step: 'thinking',
      tool: null,
    })
    expect(stepForEntry({ ...use, isSidechain: true })).toBeNull()
    expect(stepForEntry({ ...base, kind: 'user', text: 'prompt' })).toBeNull()
  })

  test('a turn goes working → waiting → working → done, and stays done until a new prompt', () => {
    const events: LiveEvent[] = [
      { type: 'step', step: 'command', tool: 'Bash' },
      { type: 'waiting', permission: true },
      { type: 'resumed' },
      { type: 'step', step: 'editing', tool: 'Edit' },
      { type: 'stop' },
      { type: 'step', step: 'reading', tool: 'Read' },
    ]
    let status = initialLiveStatus(0)
    const states = events.map((event, i) => {
      status = reduceLiveStatus(status, event, (i + 1) * 10)
      return status
    })
    expect(states.map((s) => [s.state, s.step, s.toolCount, s.changedAt, s.endedAt])).toEqual([
      ['working', 'command', 1, 0, null],
      ['waiting', 'permission', 1, 20, null],
      ['working', null, 1, 30, null],
      ['working', 'editing', 2, 30, null],
      ['done', null, 2, 50, 50],
      ['done', null, 2, 50, 50],
    ])
    expect(reduceLiveStatus(states[4]!, { type: 'prompt' }, 70)).toEqual(initialLiveStatus(70))
  })

  test('latest steps: newest first, repeats merged, at most three', () => {
    let status = initialLiveStatus(0)
    const steps: LiveEvent[] = [
      { type: 'step', step: 'thinking', tool: null },
      { type: 'step', step: 'reading', tool: 'Read' },
      { type: 'step', step: 'reading', tool: 'Read' },
      { type: 'step', step: 'searching', tool: 'Grep' },
      { type: 'step', step: 'command', tool: 'Bash' },
    ]
    for (const event of steps) status = reduceLiveStatus(status, event, 1)
    expect(status.recent).toEqual([
      { step: 'command', tool: 'Bash', count: 1 },
      { step: 'searching', tool: 'Grep', count: 1 },
      { step: 'reading', tool: 'Read', count: 2 },
    ])
  })

  test('state changes go now, step changes are throttled', () => {
    const working = initialLiveStatus(0)
    const step = reduceLiveStatus(working, { type: 'step', step: 'command', tool: 'Bash' }, 0)
    expect(planSend(null, working, null, 0)).toEqual({ when: 'now' })
    expect(planSend(working, step, 1_000, 5_000)).toEqual({
      when: 'later',
      delayMs: STEP_INTERVAL_MS - 4_000,
    })
    expect(planSend(working, step, 0, STEP_INTERVAL_MS)).toEqual({ when: 'now' })
    expect(planSend(step, step, 0, 1)).toEqual({ when: 'never' })
    expect(planSend(step, reduceLiveStatus(step, { type: 'stop' }, 1), 0, 1)).toEqual({ when: 'now' })
    const thinking = reduceLiveStatus(initialLiveStatus(0), { type: 'step', step: 'thinking', tool: null }, 0)
    const again = reduceLiveStatus(thinking, { type: 'step', step: 'thinking', tool: null }, 0)
    expect(planSend(thinking, again, 0, 1)).toEqual({ when: 'later', delayMs: STEP_INTERVAL_MS - 1 })
  })

  test('props are translated and carry only the session title and folder', () => {
    const info = { title: 'Work', host: 'mac', session: 'Fix login', path: '~/app' }
    let status = reduceLiveStatus(initialLiveStatus(7), { type: 'step', step: 'command', tool: 'Bash' }, 8)
    status = reduceLiveStatus(status, { type: 'step', step: 'tool', tool: 'mcp__github__create_issue' }, 9)
    status = reduceLiveStatus(status, { type: 'step', step: 'thinking', tool: null }, 9)
    status = reduceLiveStatus(status, { type: 'step', step: 'thinking', tool: null }, 9)
    expect(liveProps(status, info, en)).toEqual({
      title: 'Work',
      state: 'working',
      status: 'Working',
      step: 'thinking',
      tools: '2 tools',
      startedAt: 7,
      host: 'mac',
      session: 'Fix login',
      path: '~/app',
      recent: ['Thinking ×2', 'create_issue · using a tool', 'Bash · running a command'],
      ago: '{time} ago',
      changedAt: 7,
      endedAt: null,
    })
    expect(liveProps({ ...status, toolCount: 3 }, info, pt)).toMatchObject({
      status: 'Trabalhando',
      step: 'pensando',
      tools: '3 ferramentas',
      recent: ['Pensando ×2', 'create_issue · usando uma ferramenta', 'Bash · executando um comando'],
      ago: 'há {time}',
    })
  })

  test('folder and host names', () => {
    expect(shortenHome('/Users/me/app', '/Users/me')).toBe('~/app')
    expect(shortenHome('/Users/me', '/Users/me')).toBe('~')
    expect(shortenHome('/Users/meow/app', '/Users/me')).toBe('/Users/meow/app')
    expect(shortenHome('/srv/app', '/')).toBe('/srv/app')
    expect(hostName('MacBook-Pro.local')).toBe('MacBook-Pro')
    expect(hostName('devbox')).toBe('devbox')
  })
})

describe('buildLiveMessage', () => {
  const props = liveProps(
    initialLiveStatus(1_000_000),
    { title: 'Work', host: 'mac', session: '', path: '~/app' },
    en,
  )
  const message: LiveMessage = {
    sessionId: 's1',
    platform: 'ios',
    fcmToken: 'fcm',
    activityToken: 'act',
    props,
    event: 'update',
    at: 2_000_000,
    staleAt: 3_000_000,
  }

  test('iOS: ActivityKit content-state through liveActivityToken', () => {
    expect(buildLiveMessage(message)).toEqual({
      token: 'fcm',
      data: { sessionId: 's1', event: 'live' },
      apns: {
        liveActivityToken: 'act',
        headers: { 'apns-priority': '5' },
        payload: {
          aps: {
            timestamp: 2000,
            event: 'update',
            'content-state': { name: 'SessionActivity', props: JSON.stringify(props) },
            'stale-date': 3000,
          },
        },
      },
    })
    const ended = buildLiveMessage({ ...message, event: 'end', dismissAt: 2_900_000 })
    expect(ended.apns?.headers).toEqual({ 'apns-priority': '10' })
    expect(ended.apns?.payload.aps).toMatchObject({ event: 'end', 'dismissal-date': 2900 })
  })

  test('Android: one tagged, silent notification per session', () => {
    const android = buildLiveMessage({ ...message, platform: 'android', activityToken: undefined })
    expect(android).toMatchObject({
      token: 'fcm',
      android: {
        notification: {
          tag: 'live-s1',
          channelId: 'live-status',
          title: 'Work · Working',
          body: 'Working',
          sticky: true,
          notificationPriority: 'PRIORITY_LOW',
        },
      },
    })
    expect(
      buildLiveMessage({ ...message, platform: 'android', event: 'end' }).android?.notification.sticky,
    ).toBe(false)
    const named = { ...message, platform: 'android' as const, props: { ...props, session: 'Fix login' } }
    expect(buildLiveMessage(named).android?.notification.title).toBe('Fix login · Working')
  })
})

describe('LiveStatusService', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  function setup(opts: { muted?: boolean; invalid?: boolean } = {}) {
    let now = 1_000
    let onEvent: ((event: LiveEvent) => void) | null = null
    const unfollow = vi.fn()
    const sent: LiveMessage[] = []
    const sender: PushSender = {
      async send() {
        return { invalidTokens: [] }
      },
      async sendLive(message) {
        sent.push(message)
        return { invalid: opts.invalid ?? false }
      },
    }
    const service = new LiveStatusService(sender, silentLogger, {
      messages: en,
      profileOf: () => 'p1',
      info: () => ({ title: 'Work', host: 'mac', session: 'Fix login', path: '~/app' }),
      isMuted: () => opts.muted ?? false,
      follow: async (_sessionId, listener) => {
        onEvent = listener
        return unfollow
      },
      now: () => now,
    })
    return {
      service,
      sent,
      unfollow,
      emit: (event: LiveEvent) => onEvent?.(event),
      advance: (ms: number) => {
        now += ms
        vi.advanceTimersByTime(ms)
      },
    }
  }

  const register = { sessionId: 's1', platform: 'ios' as const, fcmToken: 'fcm', activityToken: 'act' }

  test('sends the state on register, throttles steps and ends on Stop', async () => {
    vi.useFakeTimers()
    const { service, sent, unfollow, emit, advance } = setup()
    await service.register(register)
    expect(sent.map((m) => [m.event, m.props.state])).toEqual([['update', 'working']])

    emit({ type: 'step', step: 'command', tool: 'Bash' })
    emit({ type: 'step', step: 'editing', tool: 'Edit' })
    expect(sent).toHaveLength(1)
    advance(STEP_INTERVAL_MS)
    expect(sent.at(-1)?.props).toMatchObject({ step: 'editing files', tools: '2 tools' })

    service.handle('s1', { type: 'waiting', permission: true })
    expect(sent.at(-1)?.props.state).toBe('waiting')

    service.handle('s1', { type: 'stop' })
    await vi.runAllTimersAsync()
    const last = sent.at(-1)!
    expect(last).toMatchObject({ event: 'end', props: { state: 'done' } })
    expect(last.dismissAt).toBe(last.at + DONE_DISMISS_MS)
    expect(service.has('s1')).toBe(false)
    expect(unfollow).toHaveBeenCalled()
  })

  test('muted sessions get an immediate end and no more updates', async () => {
    const { service, sent } = setup({ muted: true })
    await service.register(register)
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ event: 'end' })
    expect(sent[0]?.dismissAt).toBe(sent[0]?.at)
    service.handle('s1', { type: 'stop' })
    expect(sent).toHaveLength(1)
  })

  test('drops registrations whose token FCM rejects, and unregister stops updates', async () => {
    const rejected = setup({ invalid: true })
    await rejected.service.register(register)
    expect(rejected.service.has('s1')).toBe(false)

    const { service, sent, unfollow } = setup()
    await service.register(register)
    service.unregister('s1')
    service.handle('s1', { type: 'stop' })
    expect(sent).toHaveLength(1)
    expect(unfollow).toHaveBeenCalled()
  })

  test('a new registration during a turn keeps its status and the latest tokens', async () => {
    const { service, sent, emit } = setup()
    await service.register(register)
    emit({ type: 'step', step: 'command', tool: 'Bash' })
    await service.register({ ...register, activityToken: 'act2' })
    expect(sent.at(-1)).toMatchObject({ activityToken: 'act2', props: { tools: '1 tool' } })
  })
})
