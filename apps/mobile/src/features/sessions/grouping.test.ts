import type { Profile, Session } from '@claude-remote/protocol'
import { describe, expect, test } from 'vitest'
import { flattenSections, groupSessions } from './grouping'

const profiles: Profile[] = [
  { id: 'claudin', name: 'Pessoal', configDir: '', color: '#D97757' },
  { id: 'drclaude', name: 'DoctorX', configDir: '', color: '#61AFEF' },
]

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
  }
}

describe('groupSessions', () => {
  const sessions = [
    s('a', 'drclaude', 'idle', '2026-10-14T10:00:00Z'),
    s('b', 'drclaude', 'waiting', '2026-10-14T09:00:00Z'),
    s('c', 'claudin', 'ended', '2026-10-14T11:00:00Z'),
    s('d', 'claudin', 'running', '2026-10-14T08:00:00Z'),
    s('e', 'claudin', 'idle', '2026-10-14T12:00:00Z'),
    s('f', 'claudin', 'idle', '2026-10-14T07:00:00Z'),
    s('g', 'other', 'idle', '2026-10-14T07:00:00Z'),
  ]

  test('orders groups by profile and sessions by state then recency', () => {
    const sections = groupSessions(sessions, profiles)
    expect(sections.map((x) => x.profile.id)).toEqual(['claudin', 'drclaude', 'other'])
    expect(sections[0]?.sessions.map((x) => x.id)).toEqual(['d', 'e', 'f', 'c'])
    expect(sections[1]?.sessions.map((x) => x.id)).toEqual(['b', 'a'])
  })

  test('filters by profile', () => {
    expect(groupSessions(sessions, profiles, 'drclaude').map((x) => x.profile.id)).toEqual(['drclaude'])
  })

  test('flattens into header + rows', () => {
    const items = flattenSections(groupSessions(sessions, profiles, 'drclaude'))
    expect(items.map((i) => i.type)).toEqual(['header', 'session', 'session'])
  })
})
