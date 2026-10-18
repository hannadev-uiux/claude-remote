import type { Messages } from '../../core/i18n/index.ts'
import type { UpdateChannel } from './channel.ts'

/** One entry of the tray menu, rendered as-is by the helper (labels already translated). */
export type TrayItem =
  | { id: string; label: string; enabled?: boolean; checked?: boolean }
  | { type: 'separator' }
  | { type: 'submenu'; label: string; items: TrayItem[] }

export type TrayMenu = { type: 'menu'; tooltip: string; items: TrayItem[] }

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
} as const
export const CHANNEL_ACTION_PREFIX = 'channel:'

export function buildTrayMenu(s: TrayMenuState, t: Messages['updates']['tray']): TrayMenu {
  const separator = { type: 'separator' } as const
  const status = s.updating
    ? t.updating
    : s.available?.version
      ? t.updateAvailable(s.available.version)
      : t.running(s.version)
  const items: TrayItem[] = [{ id: 'status', label: status, enabled: false }, separator]
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
  return { type: 'menu', tooltip: t.tooltip(s.version), items }
}
