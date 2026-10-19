import type { PermissionRequestInfo, SessionState } from '@remote-harness/protocol'
import type { Messages } from '../../core/i18n/index.ts'
import type { UpdateChannel } from './channel.ts'

/** One entry of the tray menu, rendered as-is by the helper (labels already translated). */
export type TrayItem =
  | { id: string; label: string; enabled?: boolean; checked?: boolean }
  | { type: 'separator' }
  | { type: 'submenu'; label: string; items: TrayItem[] }

/** Glyph state in the menu bar: color encodes only the state (the amber dot is the one color). */
export type TrayIcon = 'idle' | 'working' | 'waiting' | 'offline'

export type TrayMenu = { type: 'menu'; tooltip: string; icon: TrayIcon; items: TrayItem[] }

/** A session as the tray shows it (folder already shortened, labels translated by the builder). */
export type TraySession = {
  id: string
  title: string
  folder: string
  profile: string
  state: SessionState
  worktree: boolean
  controllable: boolean
}

/** The oldest pending tool permission, answerable from the menu. */
export type TrayPending = {
  requestId: string
  sessionId: string
  title: string
  profile: string
  /** `Tool · detail`, see `pendingSummary`. */
  summary: string
  /** The daemon suggested a rule: "Always allow" is offered. */
  canAlways: boolean
}

export type TrayMenuState = {
  version: string
  channel: UpdateChannel
  auto: boolean
  available: { version: string | null; downgrade: boolean } | null
  checking: boolean
  updating: boolean
  /** The daemon runs from the installer's checkout (development clones cannot update). */
  canUpdate: boolean
  /** Under a service manager, which brings the daemon back after it exits. */
  canRestart: boolean
  /** Shell sections; absent when only the update items are wanted (tests, headless paths). */
  machine?: string
  /** Start time already formatted (`09:12`). */
  since?: string
  sessions?: TraySession[]
  pending?: TrayPending | null
  phones?: { count: number; push: boolean }
  /** At least one profile exists: "New session…" can launch it. */
  canStart?: boolean
}

/** Ids the daemon handles when the helper reports a click. */
export const TRAY_ACTIONS = {
  check: 'check',
  update: 'update',
  auto: 'auto',
  logs: 'logs',
  restart: 'restart',
  doctor: 'doctor',
  quit: 'quit',
  newSession: 'new',
  pair: 'pair',
  docs: 'docs',
  prefs: 'prefs',
} as const
export const CHANNEL_ACTION_PREFIX = 'channel:'
/** Prefixed ids: `allow:<requestId>`, `always:<requestId>`, `deny:<requestId>`, `focus:<sessionId>`, `close:<sessionId>`. */
export const TRAY_PREFIXES = {
  allow: 'allow:',
  always: 'always:',
  deny: 'deny:',
  focus: 'focus:',
  close: 'close:',
} as const
/** Live sessions listed before the rest is left to the app. */
export const MAX_TRAY_SESSIONS = 8
const SUMMARY_MAX = 48

/** `Bash · gh pr create --fill` for the pending item; the detail is cut, never the whole input. */
export function pendingSummary(info: Pick<PermissionRequestInfo, 'tool' | 'input'>): string {
  const { tool, input } = info
  const raw =
    typeof input.command === 'string'
      ? input.command
      : typeof input.file_path === 'string'
        ? input.file_path
        : typeof input.url === 'string'
          ? input.url
          : ''
  const detail = raw.replace(/\s+/g, ' ').trim()
  const short = detail.length > SUMMARY_MAX ? `${detail.slice(0, SUMMARY_MAX - 1)}…` : detail
  return short ? `${tool} · ${short}` : tool
}

/** The glyph state for the menu: waiting beats working beats idle. */
export function trayIcon(s: Pick<TrayMenuState, 'sessions' | 'pending'>): TrayIcon {
  if (s.pending) return 'waiting'
  if (s.sessions?.some((session) => session.state === 'running')) return 'working'
  return 'idle'
}

export function buildTrayMenu(s: TrayMenuState, t: Messages['updates']['tray']): TrayMenu {
  const separator = { type: 'separator' } as const
  const status = s.updating
    ? t.updating
    : s.available?.version
      ? t.updateAvailable(s.available.version)
      : s.machine && s.since
        ? t.status(s.machine, s.version, s.since)
        : t.running(s.version)
  const items: TrayItem[] = [{ id: 'status', label: status, enabled: false }, separator]

  if (s.pending) {
    const p = s.pending
    const answers: TrayItem[] = [
      { id: `${TRAY_PREFIXES.allow}${p.requestId}`, label: t.allow },
      ...(p.canAlways ? [{ id: `${TRAY_PREFIXES.always}${p.requestId}`, label: t.always }] : []),
      { id: `${TRAY_PREFIXES.deny}${p.requestId}`, label: t.deny },
      separator,
      { id: `${TRAY_PREFIXES.focus}${p.sessionId}`, label: t.focus },
    ]
    items.push(
      { id: 'waiting', label: t.waiting, enabled: false },
      { type: 'submenu', label: `${p.title} · ${p.summary}`, items: answers },
      separator,
    )
  }

  if (s.sessions) {
    const live = s.sessions.filter((session) => session.state !== 'ended')
    const ended = s.sessions.filter((session) => session.state === 'ended')
    const running = live.filter((session) => session.state === 'running').length
    items.push({ id: 'sessions', label: t.sessions(s.sessions.length, running), enabled: false })
    for (const session of live.slice(0, MAX_TRAY_SESSIONS)) {
      const meta = [session.folder, session.profile, session.worktree ? t.worktree : null].filter(Boolean)
      items.push({
        type: 'submenu',
        label: `${session.title} · ${t.states[session.state]}`,
        items: [
          { id: `info:${session.id}`, label: meta.join(' · '), enabled: false },
          { id: `${TRAY_PREFIXES.focus}${session.id}`, label: t.focus, enabled: session.controllable },
          { id: `${TRAY_PREFIXES.close}${session.id}`, label: t.close, enabled: session.controllable },
        ],
      })
    }
    if (ended.length > 0) {
      items.push({
        type: 'submenu',
        label: t.ended(ended.length),
        items: ended.slice(0, MAX_TRAY_SESSIONS).map((session) => ({
          id: `info:${session.id}`,
          label: `${session.title} · ${session.folder}`,
          enabled: false,
        })),
      })
    }
    if (s.sessions.length === 0) items.push({ id: 'no-sessions', label: t.noSessions, enabled: false })
    items.push(separator)
  }

  if (s.phones) {
    items.push({ id: 'phones', label: t.phones(s.phones.count, s.phones.push), enabled: false }, separator)
  }

  items.push(
    { id: TRAY_ACTIONS.newSession, label: t.newSession, enabled: s.canStart ?? true },
    { id: TRAY_ACTIONS.pair, label: t.pair },
    { id: TRAY_ACTIONS.docs, label: t.docs },
    { id: TRAY_ACTIONS.prefs, label: t.prefs },
    separator,
  )

  if (s.canUpdate) {
    items.push({
      id: TRAY_ACTIONS.check,
      label: s.checking ? t.checking : t.check,
      enabled: !s.checking && !s.updating,
    })
    if (s.available) {
      const version = s.available.version ?? '?'
      items.push({
        id: TRAY_ACTIONS.update,
        label: s.available.downgrade ? t.installOlder(version) : t.updateNow(version),
        enabled: !s.updating,
      })
    }
    items.push(
      { id: TRAY_ACTIONS.auto, label: t.auto, checked: s.auto },
      {
        type: 'submenu',
        label: t.channel,
        items: (['main', 'development'] as const).map((channel) => ({
          id: `${CHANNEL_ACTION_PREFIX}${channel}`,
          label: t.channels[channel],
          checked: s.channel === channel,
        })),
      },
      separator,
    )
  }
  items.push({ id: TRAY_ACTIONS.logs, label: t.logs })
  if (s.canRestart) items.push({ id: TRAY_ACTIONS.restart, label: t.restart })
  items.push({ id: TRAY_ACTIONS.doctor, label: t.doctor }, separator, {
    id: TRAY_ACTIONS.quit,
    label: t.quit,
  })
  return { type: 'menu', tooltip: t.tooltip(s.version), icon: trayIcon(s), items }
}
