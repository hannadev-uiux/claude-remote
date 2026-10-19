import type { Profile, Session } from '@remote-harness/protocol'
import type { TFunction } from '../../core/i18n/create'
import { relativeTime } from '../../core/utils/time'
import { hasSwitchableModes } from '../mode/modes'

export type SessionDetailKey =
  | 'folder'
  | 'branch'
  | 'worktree'
  | 'profile'
  | 'alias'
  | 'configDir'
  | 'state'
  | 'mode'
  | 'access'
  | 'pane'
  | 'id'
  | 'updated'

type CopyKey = Extract<SessionDetailKey, 'folder' | 'worktree' | 'id'>

/** One label/value row of the session details sheet; rows with a `copyLabel` get a Copy action. */
export type SessionDetail = { key: SessionDetailKey; label: string; value: string; copyLabel: string | null }

type DetailsSession = Pick<
  Session,
  | 'id'
  | 'profileId'
  | 'cwd'
  | 'state'
  | 'permissionMode'
  | 'approvalPolicy'
  | 'agent'
  | 'controllable'
  | 'paneId'
  | 'updatedAt'
  | 'checkout'
>

/** Claude Code's permission mode, or Codex's approval policy as Codex names it. */
function modeText(session: DetailsSession, t: TFunction): string {
  if (!hasSwitchableModes(session.agent ?? null)) return session.approvalPolicy ?? t('sessionDetails.unknown')
  return session.permissionMode ? t(`mode.labels.${session.permissionMode}`) : t('sessionDetails.unknown')
}

/**
 * Rows of the session details sheet, in display order. Rows without data (no git checkout, no tmux
 * pane; alias and config dir when the profile is unknown to the app) are left out. Paths are shown in full, never shortened.
 */
export function sessionDetails(
  session: DetailsSession,
  profile: Pick<Profile, 'name' | 'configDir'> | undefined,
  t: TFunction,
  { locale, now = Date.now() }: { locale: string; now?: number },
): SessionDetail[] {
  const row = (key: SessionDetailKey, value: string): SessionDetail => ({
    key,
    label: t(`sessionDetails.labels.${key}`),
    value,
    copyLabel: null,
  })
  const copyable = (key: CopyKey, value: string): SessionDetail => ({
    ...row(key, value),
    copyLabel: t(`sessionDetails.copyLabels.${key}`),
  })
  const { checkout } = session
  return [
    copyable('folder', session.cwd),
    ...(checkout
      ? [row('branch', checkout.branch ?? t('sessionDetails.detached')), copyable('worktree', checkout.root)]
      : []),
    row('profile', profile?.name ?? session.profileId),
    ...(profile ? [row('alias', session.profileId), row('configDir', profile.configDir)] : []),
    row('state', t(`sessions.states.${session.state}`)),
    row('mode', modeText(session, t)),
    row('access', session.controllable ? t('sessionDetails.controllable') : t('common.readOnly')),
    ...(session.paneId ? [row('pane', session.paneId)] : []),
    copyable('id', session.id),
    row('updated', updatedText(session.updatedAt, t, locale, now)),
  ]
}

/** "5 min ago · 18/10/2026, 08:21" (relative, then local date and time); the raw value if unparsable. */
function updatedText(iso: string, t: TFunction, locale: string, now: number): string {
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return iso
  let absolute: string
  try {
    absolute = new Date(time).toLocaleString(locale)
  } catch {
    absolute = iso
  }
  return `${relativeTime(iso, t, now)} · ${absolute}`
}
