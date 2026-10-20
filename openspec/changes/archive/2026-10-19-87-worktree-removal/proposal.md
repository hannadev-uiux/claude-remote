## Why

Closing a session with "Also delete the worktree" fails with only **`git worktree failed`** and leaves a half-deleted worktree: tracked top-level files gone, `node_modules/` and other ignored folders still there (issue #215).

The cause is the executor's timeout. Every git call runs with a 5-second limit, and `git worktree remove` deletes the whole folder, `node_modules` included. On a real project that takes longer, so the daemon kills git in the middle of the deletion. A killed git has no stderr, so `GitClient.must` falls back to `git worktree failed`.

A second failure mode is in the same path. Claude Code **locks** the worktrees it creates with `--worktree` (`locked claude session <name> (pid N …)`), and the lock stays after the session ends. git refuses to remove a locked worktree.

## What Changes

- **Removal never stops halfway.** Once the safety checks pass, the daemon:
  - unlocks a stale lock;
  - moves the worktree folder into the repository's git dir in one atomic rename;
  - prunes the worktree entry and deletes the merged branch;
  - deletes the moved folder in the background, with no time limit.

  If the move fails, nothing has been deleted and the worktree is intact.
- **Ignored files don't block a clean removal**, since the move takes the whole folder. Untracked files that are not ignored still count as changes, as before.
- **Locked worktrees**: a lock whose process is gone (or that names no process) is removed. A lock held by a running process stops the cleanup with a clear message.
- **Safety re-check**: just before a non-forced removal, the daemon inspects the worktree again. If the agent left changes or commits while exiting, the cleanup stops instead of losing them.
- **Real error messages**: the executor reports timeouts. `GitClient` errors say what failed: git's stderr, "timed out after N s", or the exit code. The daemon logs every cleanup failure with the worktree path.
- **App**: when the worktree step fails, the close sheet shows the message with **Retry** and **Keep the worktree**. After a close, Retry runs only the worktree cleanup, since the session has already ended.

## Capabilities

### Modified Capabilities
- `session-lifecycle`: worktree cleanup (atomic removal, locks, re-check, error messages).
- `app-session-list`: the close sheet's failure state.

## Impact

`apps/daemon` (`infra/exec.ts` `timedOut`, `infra/git.ts` removal, lock parsing and error messages, `features/lifecycle/close.ts` re-check and logging, tests with a real git repository), `apps/mobile` (`CloseSessionSheet` failure state, i18n in three catalogs). No protocol change.
