import type { TFunction } from '@/core/i18n/create'

export type KeyboardHint = { keys: string; label: string }

/**
 * The shortcuts shown under the composer with a hardware keyboard. Only shortcuts the app really
 * has: ⇧⏎ only on iOS (Android's field takes Shift+Return itself), and on tablets the permission
 * pair while a tool permission waits in the session. Phones get a short row.
 */
export function keyboardHints(
  state: { pendingPermission: boolean; tablet: boolean; os: string },
  t: TFunction,
): KeyboardHint[] {
  const newline: KeyboardHint[] = state.os === 'ios' ? [{ keys: '⇧⏎', label: t('keys.newline') }] : []
  if (!state.tablet) {
    return [
      { keys: '⏎', label: t('keys.queue') },
      ...newline,
      { keys: '⌘⏎', label: t('keys.sendNow') },
      { keys: '⌘/', label: t('keys.shortcuts') },
    ]
  }
  const hints: KeyboardHint[] = [
    { keys: '⏎', label: t('keys.queue') },
    { keys: '⌘⏎', label: t('keys.sendNow') },
    ...newline,
    { keys: '⌘1–9', label: t('keys.session') },
    { keys: '⌘K', label: t('keys.search') },
    { keys: '⌘T', label: t('keys.terminal') },
    { keys: '⌘.', label: t('keys.esc') },
    { keys: '⌘⇧M', label: t('keys.mode') },
    { keys: '⌘/', label: t('keys.shortcuts') },
  ]
  if (state.pendingPermission) hints.push({ keys: '⌘A / ⌘D', label: t('keys.answer') })
  return hints
}
