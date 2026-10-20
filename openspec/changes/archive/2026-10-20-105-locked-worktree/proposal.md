## Why

Closing a session with "also delete the worktree" fails with `cannot remove a locked working tree, lock reason: claude session … (pid N …)` (issue #266). Claude Code locks the worktrees it creates for the lifetime of the session process. When the session is closed, there are two cases, both checked in the Claude Code 2.1.304 bundle:

- **Worktree with changes:** after `/exit`, Claude Code shows its own "keep or remove the worktree?" dialog. The `SessionEnd` hook has already ended the session for the daemon, but the process is still alive and holds the lock. The daemon's removal stops on the live lock: either git's raw error in older builds, or since #215 a "locked by a running process" error.
- **Clean worktree:** Claude Code removes the worktree by itself on exit ("removing-clean"). The daemon's own removal then finds no folder to move and fails.

## What Changes

- **Wait for the lock holder:** before cleaning up, the daemon waits up to 6 seconds for the process holding the worktree's lock to exit (it polls `git worktree list --porcelain` and checks the pid).
- **End a stuck agent:** when the session is being closed and the agent is still running with its pane alive (stuck in its exit dialog), the daemon ends that pane, which the user already chose to do by deleting, then waits again.
- **Folder already gone:** a worktree whose folder is already gone is cleaned by pruning git's entry and deleting the merged branch, and reported as deleted.
- **Lock still held:** a lock still held after that keeps the worktree and replies `session_busy` instead of `internal`. The close sheet shows a translated message ("the agent is still using the worktree; try again in a moment, or keep it") next to the existing Retry and Keep buttons.

## Capabilities

### New Capabilities

### Modified Capabilities
- `session-lifecycle`: worktree cleanup waits for the agent, handles a worktree the agent removed, reports a live lock as `session_busy`

## Impact

- `apps/daemon/src/infra/git.ts`: `worktreeLock`, `WorktreeLockedError`, removal of an already-removed worktree
- `apps/daemon/src/features/lifecycle/close.ts`: `waitForLock`, `releaseAgent`, `session_busy` mapping
- `apps/mobile`: close sheet message for `session_busy`, i18n
