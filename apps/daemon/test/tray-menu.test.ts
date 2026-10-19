import { describe, expect, test } from 'vitest'
import { messagesFor } from '../src/core/i18n/index.ts'
import {
  buildTrayMenu,
  MAX_TRAY_SESSIONS,
  pendingSummary,
  type TrayItem,
  type TrayMenuState,
  type TraySession,
  trayIcon,
} from '../src/features/updates/menu.ts'

const en = messagesFor('en-US').updates.tray
const pt = messagesFor('pt-BR').updates.tray

const base: TrayMenuState = {
  version: '0.11.0',
  channel: 'main',
  auto: false,
  available: null,
  checking: false,
  updating: false,
  canUpdate: false,
  canRestart: false,
  machine: 'MacBook Pro',
  since: '09:12',
  sessions: [],
  pending: null,
  phones: { count: 1, push: true },
  canStart: true,
}

const session = (id: string, state: TraySession['state'], patch: Partial<TraySession> = {}): TraySession => ({
  id,
  title: `Session ${id}`,
  folder: '~/projects/acme-api',
  profile: 'Work',
  state,
  worktree: false,
  controllable: state !== 'ended',
  ...patch,
})

const ids = (items: TrayItem[]): string[] =>
  items.flatMap((i) => ('id' in i ? [i.id] : 'items' in i ? ids(i.items) : []))
const labels = (items: TrayItem[]): string[] =>
  items.flatMap((i) => ('label' in i ? [i.label, ...('items' in i ? labels(i.items) : [])] : []))

describe('tray shell menu', () => {
  test('status line, phones and the shell actions', () => {
    const menu = buildTrayMenu(base, en)
    expect(menu.icon).toBe('idle')
    expect(menu.items[0]).toEqual({
      id: 'status',
      label: 'MacBook Pro · 0.11.0 · since 09:12',
      enabled: false,
    })
    expect(labels(menu.items)).toContain('Phones · 1 · push ✓')
    expect(labels(menu.items)).toContain('No sessions')
    expect(ids(menu.items)).toEqual(
      expect.arrayContaining(['new', 'pair', 'docs', 'prefs', 'logs', 'doctor', 'quit']),
    )
    expect(
      buildTrayMenu({ ...base, phones: { count: 0, push: false } }, pt).items.map((i) =>
        'label' in i ? i.label : '',
      ),
    ).toContain('Celulares · 0')
  })

  test('sessions by recency with focus and close, ended ones collapsed, capped', () => {
    const sessions = [
      session('a', 'running', { worktree: true }),
      session('b', 'waiting'),
      session('c', 'idle'),
      session('d', 'ended'),
      session('e', 'ended'),
    ]
    const menu = buildTrayMenu({ ...base, sessions }, en)
    expect(menu.icon).toBe('working')
    expect(labels(menu.items)).toContain('Sessions · 5 · 1 running')
    expect(labels(menu.items)).toContain('Session a · running')
    expect(labels(menu.items)).toContain('~/projects/acme-api · Work · worktree')
    expect(ids(menu.items)).toEqual(expect.arrayContaining(['focus:a', 'close:a', 'focus:c', 'close:c']))
    expect(ids(menu.items)).not.toContain('focus:d')
    expect(labels(menu.items)).toContain('2 ended sessions')
    const many = Array.from({ length: MAX_TRAY_SESSIONS + 3 }, (_, i) => session(`s${i}`, 'idle'))
    const capped = buildTrayMenu({ ...base, sessions: many }, en)
    expect(ids(capped.items).filter((id) => id.startsWith('focus:'))).toHaveLength(MAX_TRAY_SESSIONS)
  })

  test('the oldest pending permission goes first with Allow / Always / Deny / Focus', () => {
    const pending = {
      requestId: 'r1',
      sessionId: 'b',
      title: 'Add rate limit on login',
      profile: 'Work',
      summary: 'Bash · gh pr create --fill --base main',
      canAlways: true,
    }
    const menu = buildTrayMenu({ ...base, sessions: [session('b', 'waiting')], pending }, en)
    expect(menu.icon).toBe('waiting')
    expect(labels(menu.items)).toContain('Waiting for you')
    expect(labels(menu.items)).toContain('Add rate limit on login · Bash · gh pr create --fill --base main')
    expect(ids(menu.items)).toEqual(expect.arrayContaining(['allow:r1', 'always:r1', 'deny:r1', 'focus:b']))
    const noRule = buildTrayMenu({ ...base, pending: { ...pending, canAlways: false } }, en)
    expect(ids(noRule.items)).not.toContain('always:r1')
    expect(trayIcon({ pending, sessions: [] })).toBe('waiting')
    expect(trayIcon({ pending: null, sessions: [session('x', 'idle')] })).toBe('idle')
  })

  test('pendingSummary keeps the tool and a short detail, never the whole input', () => {
    expect(pendingSummary({ tool: 'Bash', input: { command: 'gh pr create --fill --base main' } })).toBe(
      'Bash · gh pr create --fill --base main',
    )
    expect(pendingSummary({ tool: 'Edit', input: { file_path: '/w/src/a.ts', new_string: 'secret' } })).toBe(
      'Edit · /w/src/a.ts',
    )
    expect(pendingSummary({ tool: 'WebFetch', input: { url: 'https://example.com' } })).toBe(
      'WebFetch · https://example.com',
    )
    expect(pendingSummary({ tool: 'Task', input: { prompt: 'long prompt' } })).toBe('Task')
    const long = pendingSummary({ tool: 'Bash', input: { command: 'x'.repeat(100) } })
    expect(long.length).toBeLessThanOrEqual('Bash · '.length + 48)
    expect(long.endsWith('…')).toBe(true)
  })
})
