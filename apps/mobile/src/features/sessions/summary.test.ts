import type { Session } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { isWorktreePath, listSummary } from './summary'

const session = (id: string) => ({ id }) as Session

describe('listSummary', () => {
  test('counts the sessions and the distinct agents among them', () => {
    expect(listSummary([])).toEqual({ sessions: 0, agents: 0 })
    // Every session is Claude Code until the protocol carries the agent.
    expect(listSummary([session('a'), session('b'), session('c')])).toEqual({ sessions: 3, agents: 1 })
  })
})

describe('isWorktreePath', () => {
  test('recognizes folders under .claude/worktrees', () => {
    expect(isWorktreePath('/Users/me/app/.claude/worktrees/feat-x')).toBe(true)
    expect(isWorktreePath('/Users/me/app/.claude/worktrees/feat-x/packages/api')).toBe(true)
    expect(isWorktreePath('/Users/me/app')).toBe(false)
    expect(isWorktreePath('/Users/me/worktrees/app')).toBe(false)
  })
})
