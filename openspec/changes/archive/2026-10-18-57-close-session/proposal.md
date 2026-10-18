## Why

There is no way to close a session from the app: the protocol starts and resumes sessions but never ends one, so stopping a session needs the computer (or `/exit` typed from the raw terminal). Sessions started in a git worktree also leave the worktree behind. The list has no quick actions either: everything needs the session open first (#106).

## What Changes

- **Close a session** from the session screen menu and from the list. The daemon's new `session.close` ends it gracefully: pending permissions of the session are denied so the agent is not blocked, Escape closes any menu, `/exit` is typed, and the daemon waits up to 10 s for `SessionEnd` (or the pane to disappear); if the window is still there it kills the tmux pane, only when it still belongs to that session. The session becomes read-only (`ended`), the transcript stays and it can be resumed later. Read-only sessions get **Hide from list** instead.
- **Worktree cleanup when closing.** For a session in a git worktree (a linked worktree, never the main checkout), the daemon inspects it first (`worktree.inspect`: path, branch, modified/untracked files, commits not on any remote) and the close sheet offers **Also delete the worktree** with the three outcomes: uncommitted changes → **Commit & push, then delete** / **Discard changes and delete…** (second confirmation) / **Keep the worktree**; commits not pushed → **Push, then delete** / **Discard (delete branch)…** / **Keep**; clean and pushed → delete directly (and the local branch when it is merged). A failed push keeps the worktree and shows the error. **Clean up worktree** is also a separate action on read-only sessions whose worktree is still on disk (`worktree.cleanup`).
- **Swipe actions on the list** (`ReanimatedSwipeable`): swipe left → **Close** (danger) and **More**; swipe right → **Mute/Unmute** (accent) and **Pin**. A full swipe triggers the first action with a haptic; one row open at a time. Long press opens the same **action sheet**: Close session / Resume (read-only), Mute, Pin to top, Clean up worktree (with its path and change count), Copy folder path, Hide from list (read-only).
- **Pinned and hidden** sessions are kept on the device: pinned ones sort first in both orders; hidden ones leave the list until they become live again.
- Pure logic with tests: the close sequence and timeouts (daemon), the worktree decision from its git status, which actions a session offers, pins/hidden in `listSessions`; texts in pt-BR, en-US, es-ES.

## Capabilities

### New Capabilities

### Modified Capabilities
- `session-lifecycle`: new "Close session" and "Worktree cleanup" requirements.
- `app-session-list`: new "Swipe actions and action sheet" and "Pinned and hidden sessions" requirements.
- `protocol`: new "Close and worktree messages" requirement.

## Impact

- `packages/protocol`: `WorktreeInfoSchema`, `WorktreeActionSchema`, `CloseResultSchema`; client `session.close`, `worktree.inspect`, `worktree.cleanup`; server `worktree.info`.
- `apps/daemon`: `infra/git.ts` (worktree info, push, commit, remove), `infra/tmux.ts` (`killPane`), `features/lifecycle/close.ts` (+ tests), `features/lifecycle/index.ts`, `main.ts` (broker and tmux into lifecycle).
- `apps/mobile`: `features/sessions/{actions,prefs-store}.ts` (+ tests), `components/{SwipeableRow,SessionActionsSheet,CloseSessionSheet}.tsx`, `SessionRow`/`SessionsScreen`, `conversation/session-menu.ts` (+ test), the session route, the three catalogs.
