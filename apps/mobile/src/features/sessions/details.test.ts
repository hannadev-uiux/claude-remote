import type { Session } from '@remote-harness/protocol'
import { describe, expect, test } from 'vitest'
import { createI18n } from '@/core/i18n/create'
import { sessionDetails } from './details'

const en = createI18n('en-US').t
const pt = createI18n('pt-BR').t
const NOW = Date.parse('2026-10-18T12:00:00Z')

const session = (over: Partial<Session> = {}): Session => ({
  id: 'abc-123',
  profileId: 'claudin',
  cwd: '/Users/me/workspaces/a/very/long/path/to/the/project',
  title: 'Fix login',
  state: 'running',
  permissionMode: 'acceptEdits',
  controllable: true,
  paneId: '%12',
  updatedAt: '2026-10-18T11:55:00Z',
  subagents: [],
  backgroundTasks: 0,
  checkout: null,
  status: null,
  ...over,
})

const profile = { name: 'Work', configDir: '~/.claude-work' }
const opts = { locale: 'en-US', now: NOW }

describe('sessionDetails', () => {
  test('lists the rows in order, with the full folder and copy on folder and id', () => {
    const rows = sessionDetails(session(), profile, en, opts)
    expect(rows.map((r) => r.key)).toEqual([
      'folder',
      'profile',
      'alias',
      'configDir',
      'state',
      'mode',
      'access',
      'pane',
      'id',
      'updated',
    ])
    expect(rows[0]).toEqual({
      key: 'folder',
      label: 'Folder',
      value: '/Users/me/workspaces/a/very/long/path/to/the/project',
      copyLabel: 'Copy folder',
    })
    expect(rows.filter((r) => r.copyLabel).map((r) => r.key)).toEqual(['folder', 'id'])
    const value = (key: string) => rows.find((r) => r.key === key)?.value
    expect(value('profile')).toBe('Work')
    expect(value('alias')).toBe('claudin')
    expect(value('configDir')).toBe('~/.claude-work')
    expect(value('state')).toBe('running')
    expect(value('mode')).toBe('accept edits')
    expect(value('access')).toBe('controllable (tmux)')
    expect(value('pane')).toBe('%12')
    expect(value('updated')).toMatch(/^5 min · /)
  })

  test('adds branch and worktree (copyable) inside git', () => {
    const rows = sessionDetails(session({ checkout: { root: '/repo', branch: 'feat/x' } }), profile, en, opts)
    expect(rows.slice(0, 3).map((r) => [r.key, r.value, r.copyLabel])).toEqual([
      ['folder', '/Users/me/workspaces/a/very/long/path/to/the/project', 'Copy folder'],
      ['branch', 'feat/x', null],
      ['worktree', '/repo', 'Copy worktree path'],
    ])
  })

  test('says detached when the checkout has no branch', () => {
    const rows = sessionDetails(session({ checkout: { root: '/repo', branch: null } }), profile, en, opts)
    expect(rows.find((r) => r.key === 'branch')?.value).toBe('detached HEAD (no branch)')
  })

  test('read-only session: access says so and there is no pane row', () => {
    const rows = sessionDetails(session({ controllable: false, paneId: null }), profile, en, opts)
    expect(rows.find((r) => r.key === 'access')?.value).toBe('read-only')
    expect(rows.some((r) => r.key === 'pane')).toBe(false)
  })

  test('unknown profile falls back to the id and skips alias and config dir', () => {
    const rows = sessionDetails(session(), undefined, en, opts)
    expect(rows.find((r) => r.key === 'profile')?.value).toBe('claudin')
    expect(rows.some((r) => r.key === 'alias' || r.key === 'configDir')).toBe(false)
  })

  test('unknown mode and unparsable update time', () => {
    const rows = sessionDetails(session({ permissionMode: null, updatedAt: 'later' }), profile, en, opts)
    expect(rows.find((r) => r.key === 'mode')?.value).toBe('unknown')
    expect(rows.find((r) => r.key === 'updated')?.value).toBe('later')
  })

  test('labels follow the language', () => {
    const rows = sessionDetails(session({ controllable: false }), profile, pt, { locale: 'pt-BR', now: NOW })
    expect(rows[0]?.label).toBe('Pasta')
    expect(rows.find((r) => r.key === 'access')?.value).toBe('somente leitura')
  })
})
