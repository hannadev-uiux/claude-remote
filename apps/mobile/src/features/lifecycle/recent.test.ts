import type { ProjectItem } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { filterRecent, groupRecent, inlineRecent, worktreeRoot } from './recent'

const item = (cwd: string, over: Partial<ProjectItem> = {}): ProjectItem => ({
  cwd,
  lastUsedAt: '2026-10-20T10:00:00.000Z',
  branch: null,
  sessions: 0,
  ...over,
})

describe('worktreeRoot', () => {
  test('the repository of a .claude/worktrees folder', () => {
    expect(worktreeRoot('/Users/me/acme/.claude/worktrees/fix-login')).toBe('/Users/me/acme')
    expect(worktreeRoot('/Users/me/acme/.claude/worktrees/fix-login/')).toBe('/Users/me/acme')
  })

  test('null for any other folder', () => {
    expect(worktreeRoot('/Users/me/acme')).toBeNull()
    expect(worktreeRoot('/Users/me/acme/.claude')).toBeNull()
    expect(worktreeRoot('/Users/me/acme/.claude/worktrees/fix-login/packages/api')).toBeNull()
  })
})

describe('groupRecent', () => {
  test('folds worktrees into their repository where the newest of them was', () => {
    const rows = groupRecent([
      item('/Users/me/acme/.claude/worktrees/fix-login', {
        lastUsedAt: '2026-10-20T12:00:00.000Z',
        branch: 'fix/login',
      }),
      item('/Users/me/blog', { branch: 'main', sessions: 1 }),
      item('/Users/me/acme/.claude/worktrees/rate-limit'),
      item('/Users/me/acme', { branch: 'main', sessions: 2 }),
    ])
    expect(rows).toEqual([
      {
        cwd: '/Users/me/acme',
        lastUsedAt: '2026-10-20T12:00:00.000Z',
        branch: 'main',
        sessions: 2,
        worktrees: 2,
      },
      { ...item('/Users/me/blog', { branch: 'main', sessions: 1 }), worktrees: 0 },
    ])
  })

  test('a repository that is not recent itself has no branch or weekly count', () => {
    expect(groupRecent([item('/Users/me/acme/.claude/worktrees/a', { branch: 'a', sessions: 3 })])).toEqual([
      {
        cwd: '/Users/me/acme',
        lastUsedAt: '2026-10-20T10:00:00.000Z',
        branch: null,
        sessions: 0,
        worktrees: 1,
      },
    ])
  })

  test('plain directories keep their order', () => {
    const items = [item('/a'), item('/b'), item('/c'), item('/d')]
    expect(groupRecent(items).map((r) => r.cwd)).toEqual(['/a', '/b', '/c', '/d'])
  })
})

describe('inlineRecent', () => {
  test('three rows, and "See all" when more did not fit', () => {
    const many = Array.from({ length: 20 }, (_, i) => item(`/Users/me/p${i}`))
    const { rows, more } = inlineRecent(many)
    expect(rows.map((r) => r.cwd)).toEqual(['/Users/me/p0', '/Users/me/p1', '/Users/me/p2'])
    expect(more).toBe(true)
  })

  test('no "See all" when everything is shown', () => {
    expect(inlineRecent([item('/a'), item('/b'), item('/c')]).more).toBe(false)
    expect(inlineRecent([]).more).toBe(false)
  })

  test('"See all" when a worktree is folded, so it can still be picked', () => {
    expect(inlineRecent([item('/Users/me/acme/.claude/worktrees/a'), item('/Users/me/acme')])).toEqual({
      rows: [{ ...item('/Users/me/acme'), worktrees: 1 }],
      more: true,
    })
  })
})

describe('filterRecent', () => {
  const items = [
    item('/Users/me/acme', { branch: 'main' }),
    item('/Users/me/blog', { branch: 'fix/typo' }),
    item('/Users/me/acme/.claude/worktrees/rate-limit', { branch: 'feat/rate-limit' }),
  ]

  test('by path as shown or by branch, ignoring case', () => {
    expect(filterRecent(items, 'BLOG').map((i) => i.cwd)).toEqual(['/Users/me/blog'])
    expect(filterRecent(items, 'rate').map((i) => i.cwd)).toEqual([
      '/Users/me/acme/.claude/worktrees/rate-limit',
    ])
    expect(filterRecent(items, 'typo').map((i) => i.cwd)).toEqual(['/Users/me/blog'])
    expect(filterRecent(items, '~/acme')).toHaveLength(2)
  })

  test('an empty query keeps everything', () => {
    expect(filterRecent(items, '  ')).toEqual(items)
  })
})
