import type { TFunction } from '../../core/i18n/create'

export type SessionMenuAction = 'terminal' | 'toggleKeyBar' | 'history'

export type SessionMenuItem = { key: SessionMenuAction; label: string; disabled: boolean }

/**
 * Items of the session "More options" menu. Without a tmux pane nothing can be sent to the session,
 * so the terminal and the key bar are disabled (with `disabledReason`); the history only reads.
 */
export function sessionMenu(
  { controllable, keyBarVisible }: { controllable: boolean; keyBarVisible: boolean },
  t: TFunction,
): { items: SessionMenuItem[]; disabledReason?: string } {
  return {
    items: [
      { key: 'terminal', label: t('sessionMenu.terminal'), disabled: !controllable },
      {
        key: 'toggleKeyBar',
        label: keyBarVisible ? t('sessionMenu.hideKeys') : t('sessionMenu.showKeys'),
        disabled: !controllable,
      },
      { key: 'history', label: t('sessionMenu.history'), disabled: false },
    ],
    ...(controllable ? {} : { disabledReason: t('sessionMenu.readOnly') }),
  }
}
