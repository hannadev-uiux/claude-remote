import type { Session } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { isFiltering, listSessions, matchesFilter, NO_FILTER, normalizeSearch } from './filter'

function s(id: string, profileId: string, state: Session['state'], updatedAt: string): Session {
  return {
    id,
    profileId,
    state,
    updatedAt,
    cwd: '/w',
    title: id,
    permissionMode: null,
    controllable: true,
    paneId: null,
    subagents: [],
    backgroundTasks: 0,
    checkout: null,
    status: null,
  }
}

describe('listSessions', () => {
  const sessions = [
    s('a', 'drclaude', 'idle', '2026-10-14T10:00:00Z'),
    s('b', 'drclaude', 'waiting', '2026-10-14T09:00:00Z'),
    s('c', 'claudin', 'ended', '2026-10-14T11:00:00Z'),
    s('d', 'claudin', 'running', '2026-10-14T08:00:00Z'),
    s('e', 'claudin', 'idle', '2026-10-14T12:00:00Z'),
    s('f', 'claudin', 'idle', '2026-10-14T07:00:00Z'),
    s('g', 'other', 'idle', '2026-10-14T07:00:00Z'),
  ]

  test('by default one flat list by last activity, whatever the state', () => {
    expect(listSessions(sessions).map((x) => x.id)).toEqual(['e', 'c', 'a', 'b', 'd', 'f', 'g'])
  })

  test('ties on the same activity are ordered by title', () => {
    expect(listSessions(sessions.slice(5), NO_FILTER, 'recent').map((x) => x.id)).toEqual(['f', 'g'])
  })

  test('by state: waiting, running, idle, ended, newest first inside each state', () => {
    expect(listSessions(sessions, NO_FILTER, 'state').map((x) => x.id)).toEqual([
      'b',
      'd',
      'e',
      'a',
      'f',
      'g',
      'c',
    ])
  })

  test('filters by profile without grouping', () => {
    expect(listSessions(sessions, { ...NO_FILTER, profileId: 'drclaude' }).map((x) => x.id)).toEqual([
      'a',
      'b',
    ])
  })

  test('accepts any iterable', () => {
    expect(listSessions(new Set(sessions.slice(0, 2)), NO_FILTER, 'state').map((x) => x.id)).toEqual([
      'b',
      'a',
    ])
  })
})

describe('matchesFilter', () => {
  const session = {
    ...s('x', 'claudin', 'idle', '2026-10-14T10:00:00Z'),
    title: 'Corrigir sessão',
    cwd: '/w/claude-remote',
  }

  test('filters by state', () => {
    expect(matchesFilter(session, { ...NO_FILTER, state: 'active' })).toBe(true)
    expect(matchesFilter(session, { ...NO_FILTER, state: 'ended' })).toBe(false)
    const ended = { ...session, state: 'ended' as const }
    expect(matchesFilter(ended, { ...NO_FILTER, state: 'active' })).toBe(false)
    expect(matchesFilter(ended, { ...NO_FILTER, state: 'ended' })).toBe(true)
  })

  test('searches title and folder, ignoring case and accents, every word', () => {
    expect(matchesFilter(session, { ...NO_FILTER, query: 'SESSAO' })).toBe(true)
    expect(matchesFilter(session, { ...NO_FILTER, query: 'remote' })).toBe(true)
    expect(matchesFilter(session, { ...NO_FILTER, query: 'corrigir remote' })).toBe(true)
    expect(matchesFilter(session, { ...NO_FILTER, query: 'corrigir mobile' })).toBe(false)
    expect(matchesFilter(session, { ...NO_FILTER, query: '   ' })).toBe(true)
  })

  test('combines profile, state and search', () => {
    expect(matchesFilter(session, { profileId: 'drclaude', state: 'all', query: '' })).toBe(false)
    expect(matchesFilter(session, { profileId: 'claudin', state: 'active', query: 'sessão' })).toBe(true)
  })
})

test('normalizeSearch', () => {
  expect(normalizeSearch('  Ação Rápida ')).toBe('acao rapida')
})

test('isFiltering', () => {
  expect(isFiltering(NO_FILTER)).toBe(false)
  expect(isFiltering({ ...NO_FILTER, query: ' ' })).toBe(false)
  expect(isFiltering({ ...NO_FILTER, state: 'ended' })).toBe(true)
})
