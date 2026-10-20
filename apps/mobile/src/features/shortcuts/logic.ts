import type { PermissionMode, SelectableMode } from '@remote-harness/protocol'
import type { TFunction } from '@/core/i18n/create'

/** ⌘⇧M: default → accept edits → plan → default. `auto` needs its confirmation, so it is never reached. */
export function cycleMode(current: PermissionMode | null): SelectableMode {
  switch (current) {
    case 'default':
      return 'acceptEdits'
    case 'acceptEdits':
      return 'plan'
    default:
      return 'default'
  }
}

/** ⌘1–9: the session at that position of the list (1-based), or `null` past its end. */
export function nthSessionId(ids: readonly string[], n: number): string | null {
  if (!Number.isInteger(n) || n < 1) return null
  return ids[n - 1] ?? null
}

/** ⌘↑ / ⌘↓: the neighbor of `current` in the list; `null` at either end (no wrap) or when it is not listed. */
export function adjacentSessionId(
  ids: readonly string[],
  current: string | null,
  delta: 1 | -1,
): string | null {
  const index = current ? ids.indexOf(current) : -1
  if (index === -1) return null
  return ids[index + delta] ?? null
}

/** What Esc / ⌘[ do: leave the focused field, go to the list (from a session), one screen back, or nothing. */
export type BackAction = 'blur' | 'list' | 'back' | null

/**
 * Esc and ⌘[. Esc first leaves a focused field; ⌘[ goes back even from one. A session's
 * conversation goes back to the list (even after ⌘↓ replaced it); the raw terminal keeps Esc for
 * tmux, so only ⌘[ leaves it.
 */
export function backAction(pathname: string, key: 'escape' | 'bracket', typing: boolean): BackAction {
  const terminal = /^\/session\/[^/]+\/terminal\/?$/.test(pathname)
  if (key === 'escape' && terminal) return null
  if (key === 'escape' && typing) return 'blur'
  if (pathname === '/' || pathname === '') return null
  if (/^\/session\/[^/]+\/?$/.test(pathname)) return 'list'
  return 'back'
}

export type ShortcutEntry = { keys: string; label: string }
export type ShortcutGroup = { title: string; items: ShortcutEntry[] }

/** Content of the ⌘/ sheet: every shortcut the app has, by group. */
export function shortcutSheet(t: TFunction): ShortcutGroup[] {
  return [
    {
      title: t('shortcuts.navigation'),
      items: [
        { keys: '⌘1–9', label: t('shortcuts.nthSession') },
        { keys: '↑ ↓ ⏎', label: t('shortcuts.listArrows') },
        { keys: '⌘↑ ⌘↓', label: t('shortcuts.adjacentSession') },
        { keys: 'Esc ⌘[', label: t('shortcuts.back') },
        { keys: '⌘K ⌘F', label: t('shortcuts.search') },
        { keys: '⌘N', label: t('shortcuts.newSession') },
        { keys: '⌘,', label: t('shortcuts.settings') },
        { keys: '⌘/', label: t('shortcuts.help') },
      ],
    },
    {
      title: t('shortcuts.session'),
      items: [
        { keys: '⌘L', label: t('shortcuts.focusInput') },
        { keys: '⌘⇧O', label: t('shortcuts.moreOptions') },
        { keys: '⌘T', label: t('shortcuts.terminal') },
        { keys: '⌘.', label: t('shortcuts.sendEsc') },
        { keys: '⌘⇧M', label: t('shortcuts.mode') },
        { keys: '⌘A ⌘D', label: t('shortcuts.answer') },
      ],
    },
    {
      title: t('shortcuts.composer'),
      items: [
        { keys: '⏎', label: t('shortcuts.send') },
        { keys: '⌘⏎', label: t('shortcuts.sendNow') },
        { keys: 'Esc', label: t('shortcuts.blur') },
      ],
    },
  ]
}
