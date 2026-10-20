import { expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import { adjacentSessionId, backAction, cycleMode, nthSessionId, shortcutSheet } from './logic'

test('cycleMode walks default → acceptEdits → plan → default and never reaches auto', () => {
  expect(cycleMode('default')).toBe('acceptEdits')
  expect(cycleMode('acceptEdits')).toBe('plan')
  expect(cycleMode('plan')).toBe('default')
  expect(cycleMode('auto')).toBe('default')
  expect(cycleMode('bypassPermissions')).toBe('default')
  expect(cycleMode(null)).toBe('default')
})

test('nthSessionId is 1-based and null past the end', () => {
  const ids = ['a', 'b', 'c']
  expect(nthSessionId(ids, 1)).toBe('a')
  expect(nthSessionId(ids, 3)).toBe('c')
  expect(nthSessionId(ids, 4)).toBeNull()
  expect(nthSessionId(ids, 0)).toBeNull()
  expect(nthSessionId([], 1)).toBeNull()
})

test('adjacentSessionId steps through the list without wrapping', () => {
  const ids = ['a', 'b', 'c']
  expect(adjacentSessionId(ids, 'b', 1)).toBe('c')
  expect(adjacentSessionId(ids, 'b', -1)).toBe('a')
  expect(adjacentSessionId(ids, 'c', 1)).toBeNull()
  expect(adjacentSessionId(ids, 'a', -1)).toBeNull()
  // A session filtered out of the list (hidden) has no neighbors.
  expect(adjacentSessionId(ids, 'x', 1)).toBeNull()
  expect(adjacentSessionId(ids, null, 1)).toBeNull()
})

test('backAction: sessions go to the list, the terminal keeps Esc, other screens go back', () => {
  expect(backAction('/', 'escape', false)).toBeNull()
  expect(backAction('/session/abc', 'escape', false)).toBe('list')
  expect(backAction('/session/abc', 'bracket', false)).toBe('list')
  expect(backAction('/session/abc/terminal', 'escape', false)).toBeNull()
  expect(backAction('/session/abc/terminal', 'bracket', false)).toBe('back')
  expect(backAction('/session/abc/agent/xyz', 'escape', false)).toBe('back')
  expect(backAction('/settings', 'escape', false)).toBe('back')
  expect(backAction('/new', 'bracket', false)).toBe('back')
})

test('backAction: Esc leaves a focused field first, ⌘[ goes back from it', () => {
  expect(backAction('/session/abc', 'escape', true)).toBe('blur')
  expect(backAction('/', 'escape', true)).toBe('blur')
  expect(backAction('/session/abc', 'bracket', true)).toBe('list')
  // On the terminal screen Esc belongs to tmux, focused field or not.
  expect(backAction('/session/abc/terminal', 'escape', true)).toBeNull()
})

test('the shortcuts sheet has a translated label for every entry in every language', () => {
  for (const lang of ['en-US', 'pt-BR', 'es-ES'] as const) {
    const { t } = createI18n(lang)
    const groups = shortcutSheet(t)
    expect(groups.length).toBe(3)
    for (const group of groups) {
      expect(group.title).not.toMatch(/^shortcuts\./)
      for (const item of group.items) {
        expect(item.keys.length).toBeGreaterThan(0)
        expect(item.label).not.toMatch(/^shortcuts\./)
      }
    }
  }
  const en = shortcutSheet(createI18n('en-US').t)
  expect(en.flatMap((g) => g.items.map((i) => i.keys))).toContain('⌘⇧O')
})
