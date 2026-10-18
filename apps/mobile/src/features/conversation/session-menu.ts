import type { TFunction } from '../../core/i18n/create'

export type SessionMenuAction =
  | 'terminal'
  | 'subagents'
  | 'toggleKeyBar'
  | 'history'
  | 'toggleFollow'
  | 'close'

export type SessionMenuItem = { key: SessionMenuAction; label: string; disabled: boolean }

export type SubagentCounts = { count: number; running: number }

/**
 * Items of the session "More options" menu. Without a tmux pane nothing can be sent to the session,
 * so the terminal, the key bar and Close are disabled (with `disabledReason`); the history and the
 * follow toggle only affect the app. Subagents appear only when the session has some, with their
 * counts in the label.
 */
export function sessionMenu(
  {
    controllable,
    keyBarVisible,
    following,
    subagents = { count: 0, running: 0 },
  }: { controllable: boolean; keyBarVisible: boolean; following: boolean; subagents?: SubagentCounts },
  t: TFunction,
): { items: SessionMenuItem[]; disabledReason?: string } {
  const subagentItems: SessionMenuItem[] =
    subagents.count > 0
      ? [
          {
            key: 'subagents',
            label:
              subagents.running > 0
                ? t('sessionMenu.subagentsRunning', { n: subagents.count, running: subagents.running })
                : t('sessionMenu.subagents', { n: subagents.count }),
            disabled: false,
          },
        ]
      : []
  return {
    items: [
      { key: 'terminal', label: t('sessionMenu.terminal'), disabled: !controllable },
      ...subagentItems,
      {
        key: 'toggleKeyBar',
        label: keyBarVisible ? t('sessionMenu.hideKeys') : t('sessionMenu.showKeys'),
        disabled: !controllable,
      },
      { key: 'history', label: t('sessionMenu.history'), disabled: false },
      {
        key: 'toggleFollow',
        label: following ? t('sessionMenu.stopFollowing') : t('sessionMenu.follow'),
        disabled: false,
      },
      { key: 'close', label: t('sessionMenu.close'), disabled: !controllable },
    ],
    ...(controllable ? {} : { disabledReason: t('sessionMenu.readOnly') }),
  }
}
