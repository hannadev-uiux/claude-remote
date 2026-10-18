## 1. Protocol and daemon

- [x] 1.1 Protocol: `WorktreeInfoSchema`, `WorktreeActionSchema`, `CloseResultSchema`; `session.close`, `worktree.inspect`, `worktree.cleanup`, `worktree.info`; tests
- [x] 1.2 `infra/git.ts`: `worktreeInfo`, `commitAll`, `push`, `removeWorktree`; `infra/tmux.ts`: `killPane`
- [x] 1.3 `features/lifecycle/close.ts`: graceful close (deny pending, Escape, `/exit`, 10 s wait, guarded kill) and cleanup actions, wired in `index.ts` / `main.ts`; tests with fake tmux and git

## 2. App

- [x] 2.1 `prefs-store.ts` (pinned, hidden) and `listSessions` with pins/hidden; `actions.ts` (`sessionActions`, `closeOptions`) with tests; i18n in pt-BR, en-US, es-ES
- [x] 2.2 `SwipeableRow` (left Close + More, right Mute + Pin, full swipe with haptic, one open row), long press and `SessionActionsSheet` (close/resume, mute, pin, clean up worktree, copy path, hide)
- [x] 2.3 `CloseSessionSheet` (inspect, warnings, worktree checkbox and outcomes, discard confirmation) from the list and from the session menu

## 3. Verification

- [x] 3.1 `pnpm check` green; `npx expo export --platform ios` bundles
