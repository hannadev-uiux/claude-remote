import { describe, expect, test } from 'vitest'
import {
  answeredLiveNotification,
  isLiveNotificationId,
  liveNotification,
  parseLiveData,
} from './android-notification'

const props = {
  title: 'Work',
  state: 'working',
  status: 'Working',
  step: 'running a command',
  tools: '2 tools',
  startedAt: 1,
  session: 'Fix login',
  glyphs: ['⌘', '✎'],
}
const pending = { requestId: 'r1', tool: 'Bash', allow: 'Permitir', deny: 'Negar' }
const push = (live: unknown) => ({ sessionId: 's1', event: 'live', live: JSON.stringify(live) })

describe('Android live status data messages', () => {
  test('parses data.live and ignores other pushes', () => {
    const parsed = parseLiveData(push({ event: 'update', props }))
    expect(parsed).toMatchObject({
      sessionId: 's1',
      event: 'update',
      props: { title: 'Work', pending: null },
    })
    expect(parseLiveData({ sessionId: 's1', event: 'live' })).toBeNull()
    expect(parseLiveData({ sessionId: 's1', event: 'permission', live: '{}' })).toBeNull()
    expect(parseLiveData({ sessionId: 's1', event: 'live', live: '{oops' })).toBeNull()
    expect(parseLiveData(push({ event: 'update', props: { ...props, state: 'error' } }))).toBeNull()
    expect(parseLiveData(null)).toBeNull()
  })

  test('a working update is ongoing, replaces the session notification and has no buttons', () => {
    const parsed = parseLiveData(push({ event: 'update', props }))
    if (!parsed) throw new Error('not parsed')
    expect(liveNotification(parsed)).toEqual({
      identifier: 'live-s1',
      title: 'Fix login · Working',
      body: 'running a command · 2 tools · ✎ ⌘',
      sticky: true,
      actions: null,
      data: { sessionId: 's1', event: 'live' },
    })
  })

  test('a pending permission gets Allow / Deny with the translated labels and the request id', () => {
    const parsed = parseLiveData(
      push({ event: 'update', props: { ...props, state: 'waiting', status: 'Aguardando você', pending } }),
    )
    if (!parsed) throw new Error('not parsed')
    expect(liveNotification(parsed)).toMatchObject({
      sticky: true,
      actions: { allow: 'Permitir', deny: 'Negar' },
      data: { sessionId: 's1', event: 'live', requestId: 'r1' },
    })
  })

  test('done and ended statuses can be swiped away and never show buttons', () => {
    const done = parseLiveData(push({ event: 'update', props: { ...props, state: 'done', status: 'Done' } }))
    const ended = parseLiveData(push({ event: 'end', props: { ...props, state: 'waiting', pending } }))
    if (!done || !ended) throw new Error('not parsed')
    expect(liveNotification(done)).toMatchObject({ sticky: false, actions: null })
    expect(liveNotification(ended)).toMatchObject({ sticky: false, actions: null })
    expect(liveNotification(ended).data).not.toHaveProperty('requestId')
  })

  test('an answered notification keeps its text and loses the buttons', () => {
    expect(
      answeredLiveNotification({
        identifier: 'live-s1',
        title: 'Fix login · Waiting',
        body: null,
        sessionId: 's1',
      }),
    ).toEqual({
      identifier: 'live-s1',
      title: 'Fix login · Waiting',
      body: '',
      sticky: true,
      actions: null,
      data: { sessionId: 's1', event: 'live' },
    })
    expect(isLiveNotificationId('live-s1', 's1')).toBe(true)
    expect(isLiveNotificationId('abc', 's1')).toBe(false)
  })
})
