import type { SubagentInfo } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { sortSubagents, subagentLabel } from './sort'

const sub = (agentId: string, state: SubagentInfo['state'], updatedAt: string): SubagentInfo => ({
  agentId,
  agentType: null,
  description: null,
  state,
  updatedAt,
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
})
