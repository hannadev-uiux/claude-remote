import type { Session } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import { liveStateFor, localLiveProps, sessionsToStart } from './logic'

const session = (id: string, state: Session['state'], profileId = 'p1') =>
  ({ id, state, profileId }) as Session
const none = { profiles: [], sessions: [] }

describe('sessionsToStart', () => {
  test('starts sessions that just turned running', () => {
    const previous = { a: session('a', 'idle'), b: session('b', 'running') }
    const current = { a: session('a', 'running'), b: session('b', 'running'), c: session('c', 'running') }
    expect(sessionsToStart(previous, current, { enabled: true, muted: none })).toEqual(['a', 'c'])
  })

  test('skips muted sessions and profiles, and everything when disabled', () => {
    const current = { a: session('a', 'running'), b: session('b', 'running', 'p2') }
    expect(
      sessionsToStart({}, current, { enabled: true, muted: { profiles: ['p2'], sessions: ['a'] } }),
    ).toEqual([])
    expect(sessionsToStart({}, current, { enabled: false, muted: none })).toEqual([])
  })
})

describe('localLiveProps', () => {
  test('maps the session state and translates it', () => {
    expect(liveStateFor('idle')).toBe('done')
    expect(localLiveProps(session('a', 'waiting'), 'Work', 5, createI18n('pt-BR').t)).toEqual({
      title: 'Work',
      state: 'waiting',
      status: 'Esperando você',
      step: '',
      tools: '',
      startedAt: 5,
    })
  })
})
