import type { TFunction } from '@/core/i18n/create'

export type KeyboardHint = { keys: string; label: string }

/**
 * The shortcuts shown under the composer with a hardware keyboard on a tablet. Only shortcuts the
 * app really has; the permission pair appears while a tool permission waits in the session.
 */
export function keyboardHints(state: { pendingPermission: boolean }, t: TFunction): KeyboardHint[] {
  const hints: KeyboardHint[] = [
    { keys: '⏎', label: t('keys.queue') },
    { keys: '⌘⏎', label: t('keys.sendNow') },
    { keys: '⌘1–9', label: t('keys.session') },
    { keys: '⌘K', label: t('keys.search') },
    { keys: '⌘T', label: t('keys.terminal') },
    { keys: '⌘.', label: t('keys.esc') },
    { keys: '⌘⇧M', label: t('keys.mode') },
  ]
  if (state.pendingPermission) hints.push({ keys: '⌘A / ⌘D', label: t('keys.answer') })
  return hints
}
