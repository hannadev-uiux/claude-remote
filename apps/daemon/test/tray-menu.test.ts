import { describe, expect, test } from 'vitest'
import { messagesFor } from '../src/core/i18n/index.ts'
import {
  buildTrayMenu,
  MAX_TRAY_SESSIONS,
  MAX_TRAY_SESSIONS_WINDOW,
  pendingSummary,
  TRAY_ACTIONS,
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
  agent: 'claude',
  updatedAt: '2026-01-01T00:00:00.000Z',
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
    expect(ids(menu.items)).toEqual(
      expect.arrayContaining(['focus:a', 'rename:a', 'close:a', 'focus:c', 'rename:c', 'close:c']),
    )
    expect(ids(menu.items)).not.toContain('focus:d')
    expect(labels(menu.items)).toContain('2 ended sessions')
    const many = Array.from({ length: MAX_TRAY_SESSIONS + 3 }, (_, i) => session(`s${i}`, 'idle'))
    const capped = buildTrayMenu({ ...base, sessions: many }, en)
    expect(ids(capped.items).filter((id) => id.startsWith('focus:'))).toHaveLength(MAX_TRAY_SESSIONS)
    expect(ids(capped.items)).not.toContain(TRAY_ACTIONS.seeAll)
  })

  test('a helper with windows caps at 5 and adds "See all sessions…"; without windows it stays at 8', () => {
    const sessions = Array.from({ length: MAX_TRAY_SESSIONS_WINDOW + 3 }, (_, i) => session(`s${i}`, 'idle'))
    const windowed = buildTrayMenu({ ...base, sessions, windows: true }, en)
    expect(ids(windowed.items).filter((id) => id.startsWith('focus:'))).toHaveLength(MAX_TRAY_SESSIONS_WINDOW)
    expect(labels(windowed.items)).toContain('See all sessions…')
    expect(windowed.sessions).toEqual(sessions)
    expect(windowed.sessionsWindow).toEqual({
      title: 'Sessions',
      searchPlaceholder: 'Search sessions',
      actions: {
        focus: 'Open in terminal (tmux)',
        rename: 'Rename…',
        close: 'Close session',
        copyPath: 'Copy path',
      },
      renamePrompt: { title: 'Rename session', confirm: 'Rename', cancel: 'Cancel' },
    })
    const few = buildTrayMenu({ ...base, sessions: sessions.slice(0, 2), windows: true }, en)
    expect(ids(few.items)).not.toContain(TRAY_ACTIONS.seeAll)
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

  test('Pair a phone: QR on macOS, the address, the terminal and a confirmed token rotation', () => {
    const pairing = { url: 'claude-remote://pair?host=h&port=1&token=t', address: '100.64.0.2:7337' }
    const find = (items: TrayItem[], label: string) =>
      items.find((i): i is Extract<TrayItem, { type: 'submenu' }> => 'items' in i && i.label === label)
    const mac = find(buildTrayMenu({ ...base, pairing, qr: true }, en).items, 'Pair a phone')
    expect(mac?.items[0]).toEqual({ type: 'qr', text: pairing.url })
    expect(labels(mac?.items ?? [])).toEqual(
      expect.arrayContaining(['100.64.0.2:7337', 'Show the pairing in the terminal', 'Rotate token…']),
    )
    expect(ids(mac?.items ?? [])).toEqual(expect.arrayContaining(['pair', 'rotate-token']))
    // Linux helpers get no QR item; before the daemon listens, the single item stays.
    const linux = find(buildTrayMenu({ ...base, pairing, qr: false }, en).items, 'Pair a phone')
    expect(linux?.items.some((i) => 'type' in i && i.type === 'qr')).toBe(false)
    expect(buildTrayMenu({ ...base, pairing: null }, en).items).toContainEqual({
      id: 'pair',
      label: 'Pair a phone…',
    })
  })

  test('Preferences: permissions here, keep awake, push and the config file', () => {
    const prefs = {
      permissions: true,
      keepAwake: 'sessions' as const,
      push: true,
      machineName: 'MacBook Pro',
      showInMenuBar: true,
      startAtLogin: true,
    }
    const menu = buildTrayMenu({ ...base, prefs }, en)
    const sub = menu.items.find(
      (i): i is Extract<TrayItem, { type: 'submenu' }> => 'items' in i && i.label === 'Preferences',
    )
    expect(sub?.items[0]).toEqual({
      id: 'pref:permissions',
      label: 'Show permission requests here',
      checked: true,
    })
    const awake = sub?.items.find(
      (i): i is Extract<TrayItem, { type: 'submenu' }> =>
        'items' in i && i.label === 'Keep the computer awake',
    )
    expect(awake?.items).toEqual([
      { id: 'awake:off', label: 'Never', checked: false },
      { id: 'awake:sessions', label: 'While sessions are active', checked: true },
      { id: 'awake:always', label: 'Always', checked: false },
    ])
    expect(ids(sub?.items ?? [])).toEqual(expect.arrayContaining(['pref:push', 'prefs']))
    // Answers off: the waiting request keeps only Open in terminal.
    const pending = {
      requestId: 'r1',
      sessionId: 'b',
      title: 'T',
      profile: 'Work',
      summary: 'Bash · ls',
      canAlways: true,
    }
    const quiet = buildTrayMenu({ ...base, pending, prefs: { ...prefs, permissions: false } }, en)
    expect(ids(quiet.items)).toContain('focus:b')
    expect(ids(quiet.items)).not.toContain('allow:r1')
    expect(ids(quiet.items)).not.toContain('deny:r1')
  })

  test('a helper with windows gets a single Preferences item instead of the submenu, plus the window payload', () => {
    const prefs = {
      permissions: true,
      keepAwake: 'sessions' as const,
      push: true,
      machineName: 'MacBook Pro',
      showInMenuBar: true,
      startAtLogin: false,
    }
    const profiles = [{ id: 'claudin', name: 'Work', agent: 'claude', color: '#D97757' }]
    const menu = buildTrayMenu({ ...base, prefs, profiles, windows: true }, en)
    expect(menu.items).toContainEqual({ id: 'prefs', label: 'Preferences…' })
    expect(menu.items.some((i) => 'items' in i && 'label' in i && i.label === 'Preferences')).toBe(false)
    expect(menu.prefsWindow?.title).toBe('Remote Harness Preferences')
    const tab = (id: string) => menu.prefsWindow?.tabs.find((t) => t.id === id)
    expect(tab('general')?.sections[0]?.rows).toEqual(
      expect.arrayContaining([
        { kind: 'text', id: 'pref:machine-name', label: 'Machine name', value: 'MacBook Pro' },
        { kind: 'toggle', id: 'pref:show-in-menu-bar', label: 'Show in menu bar', checked: true },
      ]),
    )
    expect(tab('general')?.sections[0]?.rows).toContainEqual({
      kind: 'toggle',
      id: 'pref:start-at-login',
      label: 'Start at login',
      checked: false,
    })
    // startAtLogin null (no service manager known): the row is omitted, not shown disabled.
    const noManager = buildTrayMenu(
      { ...base, prefs: { ...prefs, startAtLogin: null }, profiles, windows: true },
      en,
    )
    const noManagerTab = noManager.prefsWindow?.tabs.find((t) => t.id === 'general')
    expect(noManagerTab?.sections[0]?.rows.some((r) => 'id' in r && r.id === 'pref:start-at-login')).toBe(
      false,
    )
    expect(tab('profiles')?.sections[0]?.rows).toEqual([{ kind: 'value', label: 'Work', value: 'claude' }])
    expect(menu.sessions).toEqual([]) // `base` has no sessions, but the field is still sent
    // Without windows, nothing is sent: the submenu already carries everything a thin helper needs.
    const thin = buildTrayMenu({ ...base, prefs, profiles }, en)
    expect(thin.prefsWindow).toBeUndefined()
  })

  test('Quit asks about the service only under a service manager', () => {
    const managed = buildTrayMenu({ ...base, canStopService: true }, en).items.at(-1)
    expect(managed).toEqual({
      type: 'submenu',
      label: 'Quit',
      items: [
        { id: 'quit', label: 'Hide the icon (the service keeps running)' },
        { id: 'quit-service', label: 'Stop the service until the next login' },
      ],
    })
    expect(buildTrayMenu(base, en).items.at(-1)).toEqual({ id: 'quit', label: 'Quit tray' })
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
