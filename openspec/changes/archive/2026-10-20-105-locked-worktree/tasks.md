## 1. Daemon

- [x] 1.1 `GitClient.worktreeLock` and `WorktreeLockedError`; removal of a worktree whose folder is gone (tests).
- [x] 1.2 `CloseService`: wait for the lock holder, end a pane stuck in the agent's exit dialog, map a live lock to `session_busy` (tests).

## 2. App

- [x] 2.1 Close sheet: translated message for `session_busy` (pt-BR, en-US, es-ES).

## 3. Validation

- [x] 3.1 `pnpm check` green.
