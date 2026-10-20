import type { Session, WorktreeAction, WorktreeInfo } from '@remote-harness/protocol'
import type { TFunction } from '../../core/i18n/create'
import { shortPath } from '../../core/utils/time'
import { isWorktreePath } from './summary'

export type SessionAction =
  | 'close'
  | 'resume'
  | 'mute'
  | 'unmute'
  | 'pin'
  | 'unpin'
  | 'cleanup'
  | 'copyPath'
  | 'hide'
  | 'followLive'
  | 'unfollowLive'

export type SessionActionItem = { key: SessionAction; label: string; detail?: string; destructive?: boolean }

export type SessionFlags = {
  muted: boolean
  pinned: boolean
  /** The session's linked worktree when the daemon already told us; `undefined` when not asked yet. */
  worktree?: WorktreeInfo | null
  /** This phone follows the session's live status; absent or `null` when the daemon cannot follow. */
  liveFollow?: boolean | null
}

/**
 * Items of a session's action sheet (long press, "More"): Close for live sessions or Resume for
 * read-only ones, mute and pin toggles, the live status follow toggle (when the daemon can follow),
 * Clean up worktree for read-only sessions in a worktree, Copy folder path, and Hide for read-only
 * sessions.
 */
export function sessionActions(
  session: Pick<Session, 'controllable' | 'cwd'>,
  flags: SessionFlags,
  t: TFunction,
): SessionActionItem[] {
  const live = session.controllable
  const items: SessionActionItem[] = [
    live
      ? { key: 'close', label: t('sessionActions.close'), destructive: true }
      : { key: 'resume', label: t('sessionActions.resume') },
    flags.muted
      ? { key: 'unmute', label: t('sessionActions.unmute') }
      : { key: 'mute', label: t('sessionActions.mute') },
    flags.pinned
      ? { key: 'unpin', label: t('sessionActions.unpin') }
      : { key: 'pin', label: t('sessionActions.pin') },
  ]
  if (typeof flags.liveFollow === 'boolean') {
    items.push(
      flags.liveFollow
        ? { key: 'unfollowLive', label: t('sessionActions.unfollowLive') }
        : { key: 'followLive', label: t('sessionActions.followLive') },
    )
  }
  const worktree = flags.worktree
  if (!live && (worktree || isWorktreePath(session.cwd))) {
    const detail = worktree
      ? t('sessionActions.cleanupDetail', {
          path: shortPath(worktree.path),
          count: worktree.dirty + worktree.unpushed,
        })
      : shortPath(session.cwd)
    items.push({ key: 'cleanup', label: t('sessionActions.cleanup'), detail, destructive: true })
  }
  items.push({ key: 'copyPath', label: t('sessionActions.copyPath') })
  if (!live) items.push({ key: 'hide', label: t('sessionActions.hide') })
  return items
}

/** The worktree actions offered once "Also delete the worktree" is on: a clean, pushed worktree just goes. */
export function closeOptions(info: Pick<WorktreeInfo, 'dirty' | 'unpushed'>): WorktreeAction[] {
  return info.dirty > 0 || info.unpushed > 0 ? ['push-delete', 'discard-delete'] : ['delete']
}

export type SwipeSides = {
  /** Revealed when swiping right, left edge, visual order; the first one fires on a full swipe. */
  start: [SessionAction, SessionAction]
  /** Revealed when swiping left, right edge, visual order; the last one fires on a full swipe. */
  end: ['more', SessionAction]
}

/** Swipe left: More + Close (Hide for read-only); swipe right: Mute/Unmute + Pin/Unpin. */
export function swipeSides(
  session: Pick<Session, 'controllable'>,
  flags: Pick<SessionFlags, 'muted' | 'pinned'>,
): SwipeSides {
  return {
    start: [flags.muted ? 'unmute' : 'mute', flags.pinned ? 'unpin' : 'pin'],
    end: ['more', session.controllable ? 'close' : 'hide'],
  }
}
