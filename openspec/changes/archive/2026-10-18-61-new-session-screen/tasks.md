## 1. Protocol and daemon

- [x] 1.1 `ProjectItemSchema` gains `branch` and `sessions` (defaults); `LifecycleService.projects` fills them (latest session's branch, sessions updated in the last 7 days); tests

## 2. App

- [x] 2.1 `new-session.ts` (`profileAgent`, `profileDetail`, `recentDetail`) with tests
- [x] 2.2 `NewSessionScreen`: Agent & profile radio list with badge and detail, Model row seam, Recent rows with branch and weekly usage, agent-neutral worktree hint and warning suggestion; i18n pt-BR, en-US, es-ES

## 3. Verification

- [x] 3.1 `pnpm check` green; `npx expo export --platform ios` bundles
