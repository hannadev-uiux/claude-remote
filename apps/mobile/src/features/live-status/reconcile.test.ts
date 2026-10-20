import type { Session } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import {
  DONE_DISMISS_MS,
  localLiveProps,
  parallelTasks,
  parseActivityMap,
  reconcileActivities,
  sessionIdFromActivityUrl,
} from './logic'

const now = Date.parse('2026-10-19T22:00:00.000Z')

describe('activities started by push', () => {
  const urls = {
    'act-push': 'claude-remote://session/f',
    'act-other': 'claude-remote://session/x',
    'act-none': null,
  }
  const running = { state: 'running' as const, updatedAt: new Date(now).toISOString() }
  const idle = { state: 'idle' as const, updatedAt: new Date(now).toISOString() }

  test('adopts the orphan whose deep link names a followed, working session', () => {
    const result = reconcileActivities(
      {},
      ['act-push', 'act-other', 'act-none'],
      { f: running, x: running },
      now,
      { urls, followed: new Set(['f']) },
    )
    expect(result.adopt).toEqual({ f: 'act-push' })
    expect(result.map).toEqual({ f: { activityId: 'act-push', doneAt: null } })
    expect(result.end.sort()).toEqual(['act-none', 'act-other'])
  })

  test('a saved activity wins over a pushed one, and idle sessions adopt nothing', () => {
    const saved = reconcileActivities(
      { f: { activityId: 'act-saved', doneAt: null } },
      ['act-saved', 'act-push'],
      { f: running },
      now,
      { urls, followed: new Set(['f']) },
    )
    expect(saved.adopt).toEqual({ f: 'act-saved' })
    expect(saved.end).toEqual(['act-push'])
    const quiet = reconcileActivities({}, ['act-push'], { f: idle }, now, { urls, followed: new Set(['f']) })
    expect(quiet.end).toEqual(['act-push'])
  })

  test('reads the session from either deep link scheme', () => {
    expect(sessionIdFromActivityUrl('claude-remote://session/abc')).toBe('abc')
    expect(sessionIdFromActivityUrl('remoteharness://session/a%20b?x=1')).toBe('a b')
    expect(sessionIdFromActivityUrl('https://example.com/session/abc')).toBeNull()
    expect(sessionIdFromActivityUrl(null)).toBeNull()
  })
})
const at = (msAgo: number) => new Date(now - msAgo).toISOString()
const live = (state: Session['state'], updatedAt = at(0)) => ({ state, updatedAt })
const fiveMin = 5 * 60_000

describe('one live status per session', () => {
  test('adopts the saved activity of live sessions and ends everything else', () => {
    const result = reconcileActivities(
      {
        a: { activityId: 'act-a', doneAt: null },
        b: { activityId: 'act-b', doneAt: null },
        gone: { activityId: 'act-gone', doneAt: null },
      },
      ['act-a', 'act-b', 'act-orphan-1', 'act-orphan-2'],
      { a: live('running'), b: live('waiting') },
      now,
    )
    expect(result.adopt).toEqual({ a: 'act-a', b: 'act-b' })
    expect(result.end.sort()).toEqual(['act-orphan-1', 'act-orphan-2'])
    expect(result.map).toEqual({
      a: { activityId: 'act-a', doneAt: null },
      b: { activityId: 'act-b', doneAt: null },
    })
  })

  test('the duplicates of the bug: three activities of one session, only the saved one stays', () => {
    const result = reconcileActivities(
      { a: { activityId: 'act-3', doneAt: null } },
      ['act-1', 'act-2', 'act-3'],
      { a: live('running') },
      now,
    )
    expect(result.adopt).toEqual({ a: 'act-3' })
    expect(result.end).toEqual(['act-1', 'act-2'])
  })

  test('a finished turn is kept inside its window, then ended', () => {
    const inWindow = reconcileActivities(
      { a: { activityId: 'act-a', doneAt: now - fiveMin } },
      ['act-a'],
      { a: live('idle') },
      now,
    )
    expect(inWindow).toMatchObject({ adopt: { a: 'act-a' }, end: [], map: { a: { doneAt: now - fiveMin } } })
    const late = reconcileActivities(
      { a: { activityId: 'act-a', doneAt: now - DONE_DISMISS_MS } },
      ['act-a'],
      { a: live('idle') },
      now,
    )
    expect(late).toEqual({ adopt: {}, end: ['act-a'], map: {} })
    // Finished while the app was not running: the session's last change starts the window.
    const fromSession = reconcileActivities(
      { a: { activityId: 'act-a', doneAt: null } },
      ['act-a'],
      { a: live('idle', at(fiveMin)) },
      now,
    )
    expect(fromSession.map.a?.doneAt).toBe(now - fiveMin)
  })

  test('closed or unknown sessions lose their activity; a dead activity drops its record', () => {
    const result = reconcileActivities(
      { a: { activityId: 'act-a', doneAt: null }, b: { activityId: 'act-b', doneAt: null } },
      ['act-a'],
      { a: live('ended'), b: live('running') },
      now,
    )
    expect(result).toEqual({ adopt: {}, end: ['act-a'], map: {} })
    expect(reconcileActivities({}, [], {}, now)).toEqual({ adopt: {}, end: [], map: {} })
  })

  test('the saved record survives anything stored', () => {
    expect(parseActivityMap(null)).toEqual({})
    expect(parseActivityMap('not json')).toEqual({})
    const stored = {
      a: { activityId: 'x', doneAt: null },
      b: { activityId: 1 },
      c: null,
      d: { activityId: 'y', doneAt: 5 },
    }
    expect(parseActivityMap(JSON.stringify(stored))).toEqual({
      a: { activityId: 'x', doneAt: null },
      d: { activityId: 'y', doneAt: 5 },
    })
  })
})

describe('tasks in parallel', () => {
  const session = { state: 'running', title: 'Fix login', cwd: '/Users/me/app' } as const
  const info = { title: 'Work', host: 'mac', startedAt: 1, changedAt: 1, endedAt: null }
  const subagents = [{ state: 'running' }, { state: 'done' }, { state: 'running' }] as Session['subagents']

  test('background tasks plus running subagents, translated', () => {
    expect(parallelTasks({ backgroundTasks: 1, subagents })).toBe(3)
    expect(parallelTasks({})).toBe(0)
    const en = createI18n('en-US').t
    expect(localLiveProps({ ...session, backgroundTasks: 1, subagents: [] }, info, en).tasks).toBe(
      '1 task running',
    )
    expect(
      localLiveProps({ ...session, backgroundTasks: 0, subagents }, info, createI18n('pt-BR').t).tasks,
    ).toBe('2 tarefas rodando')
    expect(localLiveProps(session, info, en).tasks).toBe('')
  })
})
