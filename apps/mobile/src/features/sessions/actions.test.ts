import { describe, expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import { closeOptions, sessionActions, swipeSides } from './actions'

const en = createI18n('en-US').t
const keys = (items: { key: string }[]) => items.map((i) => i.key)

describe('sessionActions', () => {
  test('a live session: close, mute, pin, copy path', () => {
    const items = sessionActions({ controllable: true, cwd: '/w/app' }, { muted: false, pinned: false }, en)
    expect(keys(items)).toEqual(['close', 'mute', 'pin', 'copyPath'])
    expect(items[0]).toMatchObject({ label: 'Close session', destructive: true })
  })

  test('a read-only session: resume, hide, and the toggles reflect the flags', () => {
    const items = sessionActions({ controllable: false, cwd: '/w/app' }, { muted: true, pinned: true }, en)
    expect(keys(items)).toEqual(['resume', 'unmute', 'unpin', 'copyPath', 'hide'])
  })

  test('the live status follow toggle follows the pin toggle when the daemon can follow', () => {
    const session = { controllable: true, cwd: '/w/app' }
    const flags = { muted: false, pinned: false }
    expect(keys(sessionActions(session, { ...flags, liveFollow: null }, en))).not.toContain('followLive')
    const off = sessionActions(session, { ...flags, liveFollow: false }, en)
    expect(keys(off)).toEqual(['close', 'mute', 'pin', 'followLive', 'copyPath'])
    expect(off[3]?.label).toBe('Follow live status')
    expect(keys(sessionActions(session, { ...flags, liveFollow: true }, en))).toContain('unfollowLive')
  })

  test('a read-only session in a worktree offers the cleanup with its details', () => {
    const cwd = '/Users/me/app/.claude/worktrees/remote-1'
    const guess = sessionActions({ controllable: false, cwd }, { muted: false, pinned: false }, en)
    expect(guess.find((i) => i.key === 'cleanup')).toMatchObject({
      detail: '~/app/.claude/worktrees/remote-1',
    })
    const known = sessionActions(
      { controllable: false, cwd },
      {
        muted: false,
        pinned: false,
        worktree: { path: cwd, branch: 'remote-1', mainRoot: '/Users/me/app', dirty: 2, unpushed: 3 },
      },
      en,
    )
    expect(known.find((i) => i.key === 'cleanup')?.detail).toBe(
      '~/app/.claude/worktrees/remote-1 · 5 changes',
    )
    // A live session never offers it: the daemon refuses while the agent runs there.
    expect(
      keys(sessionActions({ controllable: true, cwd }, { muted: false, pinned: false }, en)),
    ).not.toContain('cleanup')
  })
})

test('closeOptions', () => {
  expect(closeOptions({ dirty: 0, unpushed: 0 })).toEqual(['delete'])
  expect(closeOptions({ dirty: 1, unpushed: 0 })).toEqual(['push-delete', 'discard-delete'])
  expect(closeOptions({ dirty: 0, unpushed: 2 })).toEqual(['push-delete', 'discard-delete'])
})

test('swipeSides', () => {
  expect(swipeSides({ controllable: true }, { muted: false, pinned: false })).toEqual({
    start: ['mute', 'pin'],
    end: ['more', 'close'],
  })
  expect(swipeSides({ controllable: false }, { muted: true, pinned: true })).toEqual({
    start: ['unmute', 'unpin'],
    end: ['more', 'hide'],
  })
})
