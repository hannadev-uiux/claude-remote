import type { Session } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { sharedCheckoutCounts } from './checkout'

function s(id: string, root: string | null, patch: Partial<Session> = {}): Session {
  return {
    id,
    profileId: 'claudin',
    state: 'running',
    updatedAt: '2026-10-15T10:00:00Z',
    cwd: root ?? '/tmp',
    title: id,
    permissionMode: null,
    controllable: true,
    paneId: '%1',
    subagents: [],
    backgroundTasks: 0,
    checkout: root ? { root, branch: 'main' } : null,
    ...patch,
  }
}

describe('sharedCheckoutCounts', () => {
  test('counts the other live sessions in each checkout', () => {
    expect(
      sharedCheckoutCounts([
        s('a', '/w/api'),
        s('b', '/w/api', { state: 'idle' }),
        s('c', '/w/api', { state: 'waiting' }),
        s('d', '/w/api/.claude/worktrees/remote-1'),
        s('e', '/w/web'),
      ]),
    ).toEqual({ a: 2, b: 2, c: 2 })
  })

  test('ended, read-only and non-git sessions do not count', () => {
    expect(
      sharedCheckoutCounts([
        s('a', '/w/api'),
        s('b', '/w/api', { state: 'ended' }),
        s('c', '/w/api', { controllable: false }),
        s('d', null),
        s('e', null),
      ]),
    ).toEqual({})
  })
})
