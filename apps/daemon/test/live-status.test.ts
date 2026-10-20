import { LiveDataMessageSchema, type TranscriptEntry } from '@remote-harness/protocol'
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
  parallelTasks,
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
    expect(stepForEntry({ ...base, kind: 'user', text: 'prompt', images: [] })).toBeNull()
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
      glyphs: ['·', '·', '·', '⌘'],
      pending: null,
      hint: '',
      tasks: '',
    })
    expect(liveProps({ ...status, tasks: 1 }, info, en).tasks).toBe('1 task running')
    expect(liveProps({ ...status, tasks: 2 }, info, pt).tasks).toBe('2 tarefas rodando')
    expect(liveProps({ ...status, toolCount: 3 }, info, pt)).toMatchObject({
      status: 'Trabalhando',
      step: 'pensando',
      tools: '3 ferramentas',
      recent: ['Pensando ×2', 'create_issue · usando uma ferramenta', 'Bash · executando um comando'],
      ago: 'há {time}',
    })
  })

  test('tasks in parallel: background tasks plus running subagents, kept across turns', () => {
    const subagent = (state: 'running' | 'done') => ({ state }) as never
    expect(parallelTasks({ backgroundTasks: 1, subagents: [subagent('running'), subagent('done')] })).toBe(2)
    expect(parallelTasks({ backgroundTasks: 0, subagents: [] })).toBe(0)
    let status = reduceLiveStatus(initialLiveStatus(1), { type: 'tasks', count: 2 }, 2)
    expect(status.tasks).toBe(2)
    status = reduceLiveStatus(status, { type: 'stop' }, 3)
    // Background tasks outlive the turn: the done status still follows the count.
    status = reduceLiveStatus(status, { type: 'tasks', count: 1 }, 4)
    expect(status).toMatchObject({ state: 'done', tasks: 1 })
    expect(reduceLiveStatus(status, { type: 'prompt' }, 5)).toMatchObject({ state: 'working', tasks: 1 })
    // The session closing during the done window closes it (and ends the activity at once).
    const closed = reduceLiveStatus(status, { type: 'end' }, 6)
    expect(closed).toMatchObject({ state: 'closed', endedAt: 6 })
    expect(reduceLiveStatus(closed, { type: 'tasks', count: 3 }, 7)).toBe(closed)
    // A count change is throttled like a step.
    const sent = initialLiveStatus(1)
    expect(planSend(sent, { ...sent, tasks: 1 }, 1, 2)).toMatchObject({ when: 'later' })
  })

  test('folder and host names', () => {
    expect(shortenHome('/Users/me/app', '/Users/me')).toBe('~/app')
    expect(shortenHome('/Users/me', '/Users/me')).toBe('~')
    expect(shortenHome('/Users/meow/app', '/Users/me')).toBe('/Users/meow/app')
    expect(shortenHome('/srv/app', '/')).toBe('/srv/app')
    expect(hostName('MacBook-Pro.local')).toBe('MacBook-Pro')
    expect(hostName('devbox')).toBe('devbox')
    expect(hostName('MacBook-Pro.local', { REMOTE_HARNESS_HOST_NAME: 'studio' })).toBe('studio')
    expect(hostName('MacBook-Pro.local', { REMOTE_HARNESS_HOST_NAME: '' })).toBe('MacBook-Pro')
  })
})

describe('pending permission and glyphs', () => {
  const info = { title: 'Work', host: 'mac', session: 'Fix login', path: '~/app' }

  test('a tool permission sets pending with translated labels, cleared when resolved', () => {
    let status = reduceLiveStatus(initialLiveStatus(0), { type: 'step', step: 'command', tool: 'Bash' }, 1)
    status = reduceLiveStatus(
      status,
      { type: 'waiting', permission: true, pending: { requestId: 'r1', tool: 'mcp__gh__pr' } },
      2,
    )
    expect(status).toMatchObject({ state: 'waiting', step: 'permission', pending: { requestId: 'r1' } })
    expect(status.glyphs).toEqual(['permission', 'command'])
    // Hearing about the same wait again neither duplicates the glyph nor loses the request.
    status = reduceLiveStatus(status, { type: 'waiting', permission: true }, 3)
    expect(status.glyphs).toEqual(['permission', 'command'])
    const props = liveProps(status, info, pt)
    expect(props.pending).toEqual({ requestId: 'r1', tool: 'pr', allow: 'Permitir', deny: 'Negar' })
    expect(props.glyphs).toEqual(['?', '⌘'])
    // Handed over to the terminal: still waiting, without the lock-screen answer.
    const handedOver = reduceLiveStatus(status, { type: 'waiting', permission: true, pending: null }, 3)
    expect(handedOver).toMatchObject({ state: 'waiting', step: 'permission', pending: null })
    const resumed = reduceLiveStatus(status, { type: 'resumed' }, 4)
    expect(resumed).toMatchObject({ state: 'working', pending: null })
    expect(liveProps(resumed, info, en).pending).toBeNull()
  })

  test('a pending change is sent at once', () => {
    const working = reduceLiveStatus(initialLiveStatus(0), { type: 'step', step: 'command', tool: 'Bash' }, 0)
    const waiting = reduceLiveStatus(
      working,
      { type: 'waiting', permission: true, pending: { requestId: 'r1', tool: 'Bash' } },
      1,
    )
    const other = { ...waiting, pending: { requestId: 'r2', tool: 'Edit' } }
    expect(planSend(waiting, other, 1, 2)).toEqual({ when: 'now' })
  })

  test('glyphs keep the last five steps, newest first; hints for done and closed', () => {
    let status = initialLiveStatus(0)
    for (const [step, tool] of [
      ['command', 'Bash'],
      ['editing', 'Edit'],
      ['searching', 'Grep'],
      ['web', 'WebFetch'],
      ['agent', 'Task'],
      ['reading', 'Read'],
    ] as const) {
      status = reduceLiveStatus(status, { type: 'step', step, tool }, 1)
    }
    expect(liveProps(status, info, en).glyphs).toEqual(['⌕', '⌥', '⇄', '⌕', '✎'])
    const done = reduceLiveStatus(status, { type: 'stop' }, 2)
    expect(liveProps(done, info, en).hint).toBe('total')
    const closed = reduceLiveStatus(status, { type: 'end' }, 2)
    expect(liveProps(closed, info, en).hint).toBe('transcript kept · resume from the app')
    expect(liveProps(closed, info, pt).hint).toBe('transcrição mantida · retome pelo app')
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

  /** The system-drawn notification of an Android message (absent for data messages). */
  const notification = (m: LiveMessage) => {
    const built = buildLiveMessage(m)
    return built.android && 'notification' in built.android ? built.android.notification : undefined
  }

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
    expect(notification({ ...message, platform: 'android', event: 'end' })?.sticky).toBe(false)
    const named = { ...message, platform: 'android' as const, props: { ...props, session: 'Fix login' } }
    expect(notification(named)?.title).toBe('Fix login · Working')
    // The finished turn can be swiped away while it waits; the body names the tasks in parallel.
    const done = { ...message, platform: 'android' as const, props: { ...props, state: 'done' as const } }
    expect(notification(done)?.sticky).toBe(false)
    const tasks = { ...message, platform: 'android' as const, props: { ...props, tasks: '2 tasks running' } }
    expect(notification(tasks)?.body).toBe('2 tasks running')
  })

  test('Android with androidDataMessages: a data message the app draws, collapsed per session', () => {
    const android: LiveMessage = {
      ...message,
      platform: 'android',
      activityToken: undefined,
      androidDataMessages: true,
    }
    const built = buildLiveMessage(android)
    expect(built).toEqual({
      token: 'fcm',
      data: { sessionId: 's1', event: 'live', live: JSON.stringify({ event: 'update', props }) },
      android: { priority: 'normal', collapseKey: 'live-s1' },
    })
    expect(built).not.toHaveProperty('notification')
    const live = (m: { data: Record<string, string> }) => JSON.parse(m.data.live ?? '')
    expect(LiveDataMessageSchema.parse(live(built))).toEqual({ event: 'update', props })
    // What the user may act on goes at once.
    const pending = liveProps(
      reduceLiveStatus(
        initialLiveStatus(1_000_000),
        {
          type: 'waiting',
          permission: true,
          pending: { requestId: 'r1', tool: 'mcp__github__create_issue' },
        },
        1_500_000,
      ),
      { title: 'Work', host: 'mac', session: 'Fix login', path: '~/app' },
      pt,
    )
    const waiting = buildLiveMessage({ ...android, props: pending })
    expect(waiting.android).toMatchObject({ priority: 'high' })
    expect(live(waiting).props.pending).toEqual({
      requestId: 'r1',
      tool: 'create_issue',
      allow: pt.allow,
      deny: pt.deny,
    })
    expect(buildLiveMessage({ ...android, event: 'end' }).android).toMatchObject({ priority: 'high' })
  })

  test('Android data messages stay well under the FCM data limit', () => {
    const busy = liveProps(
      {
        ...initialLiveStatus(1_000_000),
        recent: [
          { step: 'command', tool: 'Bash', count: 12 },
          { step: 'editing', tool: 'MultiEdit', count: 3 },
          { step: 'searching', tool: 'Grep', count: 1 },
        ],
        glyphs: ['command', 'editing', 'searching', 'reading', 'web'],
        toolCount: 99,
        tasks: 3,
        pending: { requestId: 'a'.repeat(36), tool: 'mcp__some_server__some_long_tool_name' },
      },
      {
        title: 'A long profile name',
        host: 'a-long-host-name.local',
        session: 'x'.repeat(120),
        path: `~/${'p'.repeat(120)}`,
      },
      pt,
    )
    const palette = {
      background: '#0D0D0D',
      text: '#E8E6E3',
      textMuted: '#8A8784',
      accent: '#E8A33D',
      success: '#7FB069',
      warning: '#F3DC7A',
    }
    const built = buildLiveMessage({
      ...message,
      platform: 'android',
      androidDataMessages: true,
      props: { ...busy, palette },
    })
    expect(JSON.stringify(built.data).length).toBeLessThan(3_000)
  })
})

describe('LiveStatusService', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  function setup(opts: { muted?: boolean; invalid?: boolean; tasks?: { count: number } } = {}) {
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
      ...(opts.tasks ? { tasksOf: () => opts.tasks?.count ?? 0 } : {}),
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

  test('echoes the app palette in every update of the registration', async () => {
    const { service, sent } = setup()
    const palette = {
      background: '#0D0D0D',
      text: '#E8E6E3',
      textMuted: '#8A8784',
      accent: '#E8A33D',
      success: '#7FB069',
      warning: '#F3DC7A',
    }
    await service.register({ ...register, palette })
    service.handle('s1', { type: 'waiting', permission: true })
    expect(sent.map((m) => m.props.palette)).toEqual([palette, palette])
    // Older apps register without one: the widget then falls back to its dark colors.
    await service.register({ ...register, sessionId: 's2' })
    expect(sent.at(-1)?.props.palette).toBeUndefined()
  })

  test('passes androidDataMessages of the registration to every update', async () => {
    const { service, sent } = setup()
    const android = { sessionId: 's1', platform: 'android' as const, fcmToken: 'fcm' }
    await service.register({ ...android, androidDataMessages: true })
    service.handle('s1', { type: 'waiting', permission: true })
    expect(sent.map((m) => m.androidDataMessages)).toEqual([true, true])
    await service.register({ ...android, sessionId: 's2' })
    expect(sent.at(-1)).not.toHaveProperty('androidDataMessages')
  })

  test('sends the state on register, throttles steps and ends 15 minutes after Stop', async () => {
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
    // Done is an update: the activity stays, and so does the registration.
    expect(sent.at(-1)).toMatchObject({ event: 'update', props: { state: 'done', hint: 'total' } })
    expect(service.has('s1')).toBe(true)
    advance(DONE_DISMISS_MS - 1)
    expect(sent.at(-1)?.event).toBe('update')
    advance(1)
    await vi.runAllTimersAsync()
    const last = sent.at(-1)!
    expect(last).toMatchObject({ event: 'end', props: { state: 'done' } })
    expect(last.dismissAt).toBe(last.at)
    expect(service.has('s1')).toBe(false)
    expect(unfollow).toHaveBeenCalled()
  })

  test('a new turn within the done window updates the same activity and is not ended', async () => {
    vi.useFakeTimers()
    const { service, sent, advance } = setup()
    await service.register(register)
    service.handle('s1', { type: 'stop' })
    advance(5 * 60_000)
    service.handle('s1', { type: 'prompt' })
    expect(sent.at(-1)).toMatchObject({ event: 'update', activityToken: 'act', props: { state: 'working' } })
    advance(DONE_DISMISS_MS)
    await vi.runAllTimersAsync()
    expect(sent.some((m) => m.event === 'end')).toBe(false)
    expect(service.has('s1')).toBe(true)
  })

  test('re-registering a finished turn keeps it done and its window', async () => {
    vi.useFakeTimers()
    const { service, sent, advance } = setup()
    await service.register(register)
    service.handle('s1', { type: 'stop' })
    advance(10 * 60_000)
    // The app adopted the activity again after a restart.
    await service.register(register)
    expect(sent.at(-1)).toMatchObject({ event: 'update', props: { state: 'done' } })
    advance(5 * 60_000)
    await vi.runAllTimersAsync()
    expect(sent.at(-1)?.event).toBe('end')
  })

  test('the task count comes with the registration and follows the session', async () => {
    vi.useFakeTimers()
    const tasks = { count: 2 }
    const { service, sent, advance } = setup({ tasks })
    await service.register(register)
    expect(sent.at(-1)?.props.tasks).toBe('2 tasks running')
    service.handle('s1', { type: 'tasks', count: 0 })
    advance(STEP_INTERVAL_MS)
    expect(sent.at(-1)?.props.tasks).toBe('')
  })

  test('a closed session still ends at once', async () => {
    const { service, sent } = setup()
    await service.register(register)
    service.handle('s1', { type: 'end' })
    await Promise.resolve()
    expect(sent.at(-1)).toMatchObject({ event: 'end', props: { state: 'closed' } })
    expect(sent.at(-1)?.dismissAt).toBe(sent.at(-1)?.at)
    expect(service.has('s1')).toBe(false)
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
