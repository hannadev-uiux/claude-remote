import type { SubagentInfo } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { sortSubagents, subagentCounts, subagentElapsed, subagentLabel } from './sort'

const sub = (agentId: string, state: SubagentInfo['state'], updatedAt: string): SubagentInfo => ({
  agentId,
  agentType: null,
  description: null,
  state,
  updatedAt,
  startedAt: null,
  toolCount: 0,
})

describe('subagents', () => {
  test('running first, newest first', () => {
    const list = [sub('a', 'done', '3'), sub('b', 'running', '1'), sub('c', 'running', '2')]
    expect(sortSubagents(list).map((s) => s.agentId)).toEqual(['c', 'b', 'a'])
  })

  test('label prefers description, then type, then id', () => {
    expect(subagentLabel({ ...sub('abcdefghij', 'done', ''), description: 'Buscar' })).toBe('Buscar')
    expect(subagentLabel({ ...sub('abcdefghij', 'done', ''), agentType: 'Explore' })).toBe('Explore')
    expect(subagentLabel(sub('abcdefghij', 'done', ''))).toBe('abcdefgh')
  })

  test('counts total and running', () => {
    expect(subagentCounts([])).toEqual({ count: 0, running: 0 })
    expect(subagentCounts([sub('a', 'done', ''), sub('b', 'running', ''), sub('c', 'running', '')])).toEqual({
      count: 3,
      running: 2,
    })
  })

  test('elapsed: live while running, total once done, unknown without a start', () => {
    const now = Date.parse('2026-10-18T12:01:12Z')
    const started = '2026-10-18T12:00:00Z'
    expect(subagentElapsed({ state: 'running', startedAt: started, updatedAt: started }, now)).toBe(72_000)
    expect(
      subagentElapsed({ state: 'done', startedAt: started, updatedAt: '2026-10-18T12:03:05Z' }, now),
    ).toBe(185_000)
    expect(subagentElapsed({ state: 'running', startedAt: null, updatedAt: started }, now)).toBeNull()
    expect(subagentElapsed({ state: 'done', startedAt: 'nope', updatedAt: started }, now)).toBeNull()
    // A clock behind the daemon never shows a negative counter.
    expect(subagentElapsed({ state: 'running', startedAt: started, updatedAt: started }, now - 100_000)).toBe(
      0,
    )
  })
})
