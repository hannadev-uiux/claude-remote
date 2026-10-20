import type { Session } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { isWorktreePath, listSummary } from './summary'

const session = (id: string, patch: Partial<Session> = {}) =>
  ({ id, state: 'idle', backgroundTasks: 0, subagents: [], ...patch }) as Session

const EMPTY = { sessions: 0, running: 0, waiting: 0, tasks: 0, agents: 0, agentsRunning: 0 }

describe('listSummary', () => {
  test('counts sessions, running, waiting and the distinct agents among them', () => {
    expect(listSummary([])).toEqual(EMPTY)
    // Every session is Claude Code until the protocol carries the agent.
    expect(listSummary([session('a'), session('b'), session('c')])).toEqual({
      ...EMPTY,
      sessions: 3,
      agents: 1,
    })
  })

  test('running and waiting are mutually exclusive counts', () => {
    const summary = listSummary([
      session('a', { state: 'running' }),
      session('b', { state: 'running' }),
      session('c', { state: 'waiting' }),
      session('d', { state: 'idle' }),
      session('e', { state: 'ended' }),
    ])
    expect(summary).toEqual({ sessions: 5, running: 2, waiting: 1, tasks: 0, agents: 1, agentsRunning: 1 })
  })

  test('tasks sum background tasks and running subagents across every session', () => {
    const summary = listSummary([
      session('a', { backgroundTasks: 2 }),
      session('b', {
        subagents: [
          {
            agentId: 'x',
            agentType: null,
            description: null,
            state: 'running',
            updatedAt: '',
            startedAt: null,
            toolCount: 0,
          },
          {
            agentId: 'y',
            agentType: null,
            description: null,
            state: 'done',
            updatedAt: '',
            startedAt: null,
            toolCount: 0,
          },
        ],
      }),
    ])
    expect(summary.tasks).toBe(3)
  })

  test('agentsRunning only counts agents with a running session', () => {
    const summary = listSummary([
      session('a', { agent: 'claude', state: 'idle' }),
      session('b', { agent: 'codex', state: 'running' }),
    ])
    expect(summary).toEqual({
      sessions: 2,
      running: 1,
      waiting: 0,
      tasks: 0,
      agents: 2,
      agentsRunning: 1,
    })
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
