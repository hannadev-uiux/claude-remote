## 1. Protocol

- [x] 1.1 Add the `session.started { paneId: string, sessionId: string | null }` server message to `packages/protocol/src/server.ts` and make it the typed reply to `session.start`; update `packages/protocol/test/protocol.test.ts` with parse cases for both a resolved and a `null` `sessionId`, and verify `pnpm --filter @remote-harness/protocol test` passes.
- [x] 1.2 Verify `openspec validate 95-open-new-session --strict` passes once 1.1 lands.

## 2. Daemon

- [x] 2.1 Add a `waitForSession(paneId: string, timeoutMs: number) => Promise<string | null>` collaborator to `LifecycleService`'s constructor (default resolves `null`, mirroring `hasPane`'s default), and call it from `start()` after the existing settle/`hasPane` check, with a bounded timeout constant exported next to `START_SETTLE_MS`; `start()` now resolves `{ paneId, sessionId }`. Verified with a `LifecycleService` unit test (`apps/daemon/test/lifecycle.test.ts`, the project's actual daemon test location) that stubs `waitForSession` to resolve a `sessionId` and asserts it is returned.
- [x] 2.2 Add a unit test for the timeout path: `waitForSession` stub resolves `null` (or never resolves before the timeout), and `start()` still resolves with `sessionId: null` without throwing and without exceeding the bounded wait.
- [x] 2.3 Wire the real `waitForSession` in `apps/daemon/src/features/lifecycle/index.ts`: check `store.findByPane(paneId)` for an already-registered session first, else race a one-shot `store.onChange` listener (resolving on the first upserted/created session whose `paneId` matches) against a timer; dispose the listener on either outcome. Verify with a test against a real `SessionStore` (fire the hook's `upsert` mid-wait and assert the resolved `sessionId`, and assert it still resolves `null` when nothing registers before the timeout).
- [x] 2.4 Change the `session.start` router handler in `index.ts` to reply `{ type: 'session.started', paneId: data.paneId, sessionId: data.sessionId }` instead of `ack`. Verify `pnpm --filter @remote-harness/daemon test` and `typecheck` pass.

## 3. App — navigate into the new session

- [x] 3.1 Add `apps/mobile/src/features/lifecycle/open-after-create-store.ts` (zustand + `expo-secure-store`, `enabled: true` default), modeled on `apps/mobile/src/features/push/push-settings-store.ts`, with `useOpenAfterCreateSettings`, `restoreOpenAfterCreateSettings()` and `setOpenAfterCreate()`. **Adjusted**: per `CLAUDE.md` ("só código sem react-native é testado com Vitest") this project does not unit-test these thin persisted-setting stores — confirmed no `*-store.ts` under `apps/mobile/src` has a sibling test, including the `push-settings-store.ts` this one is modeled on. Verified instead by `pnpm --filter @remote-harness/mobile typecheck` passing with the store's exported API used by the rest of this change.
- [x] 3.2 Call `restoreOpenAfterCreateSettings()` at app start alongside the existing `restorePushSettings()` / `restoreThemePreference()` calls. Verified by reading `apps/mobile/src/app/_layout.tsx` and confirming the call is present.
- [x] 3.3 In `NewSessionScreen.tsx`'s `launch()`, read `session.started`'s `{ paneId, sessionId }` instead of discarding the reply. When `useOpenAfterCreateSettings` is off, keep calling `router.back()` exactly as today. **Adjusted verification**: `NewSessionScreen.tsx` imports `react-native` and is not unit-tested in this codebase (no component render tests exist anywhere under `apps/mobile/src/features`, e.g. no test for `NotificationsCard.tsx`/`ProfilesCard.tsx` either) — verified by `pnpm --filter @remote-harness/mobile typecheck` and manual code reading of the branch.
- [x] 3.4 When the setting is on and `sessionId` is present, replace the route with `router.replace({ pathname: '/session/[id]', params: { id: sessionId, autofocus: '1' } })` instead of `router.back()`. Same adjusted verification as 3.3 (typecheck + code reading; no component tests in this codebase).
- [x] 3.5 When the setting is on and `sessionId` is `null`, keep the screen busy showing a starting message built from the selected profile's agent name and the trimmed `cwd` (new i18n key, see task 6), and subscribe to `useSessionsStore` for a session whose `paneId` equals the launched one; on first match, do the same `router.replace` as 3.4 and unsubscribe. Same adjusted verification as 3.3.

## 4. App — composer focus

- [x] 4.1 Read the `autofocus` search param in `apps/mobile/src/app/(main)/session/[id]/index.tsx` and pass it to `SmartComposer` as a new `autoFocus?: boolean` prop. Verified by `pnpm --filter @remote-harness/mobile typecheck` passing.
- [x] 4.2 In `SmartComposer.tsx`, call `input.current?.focus()` once on mount when `autoFocus` is true. Same adjusted verification as 3.3 (no component tests in this codebase) — verified by typecheck and `npx biome check --error-on-warnings apps packages` passing (catches the hook's dependency lint too).

## 5. Settings toggle

- [x] 5.1 Add `apps/mobile/src/features/settings/NewSessionCard.tsx` (one `Card`, one toggle row, bound to `useOpenAfterCreateSettings` / `setOpenAfterCreate`), modeled on the `ToggleRow` usage in `NotificationsCard.tsx`. Same adjusted verification as 3.3.
- [x] 5.2 Render `<NewSessionCard />` in `SettingsScreen.tsx` between `<ProfilesCard />` and `<NotificationsCard />`, and update its ordering doc comment. Verified by reading the file and by typecheck.

## 6. i18n

- [x] 6.1 Add the new keys (settings card title/hint for the toggle, the "Starting <agent> in <path>…" progress string) to `apps/mobile/src/core/i18n/locales/en-US.ts`, `pt-BR.ts` and `es-ES.ts` with the same key paths in all three. Verified: `pnpm --filter @remote-harness/mobile test` (512 tests, including the i18n catalog-parity test) passes.

## 7. Full verification

- [x] 7.1 Run `pnpm check` at the repo root. `turbo run typecheck test` is green (daemon 536 tests, mobile 512 tests, protocol 123 tests, all passing; typecheck clean). Its final step, `biome check --error-on-warnings .`, fails with "paths were provided but ignored: ." — pre-existing to this environment, not caused by this change: this worktree's own directory lives under `.claude/worktrees/`, which root `.gitignore` excludes, so Biome's VCS-aware ignore (`vcs.useIgnoreFile: true`) refuses the bare `.` path from inside any worktree checkout. Verified the real lint is clean by running `npx biome check --error-on-warnings apps packages` directly (598 files, 0 errors).
- [ ] 7.2 Manually verify on a simulator/device per the proposal's acceptance criteria: starting a Claude Code session (with and without worktree) lands in it with the keyboard up; starting a Codex session does too; a rejected start (e.g. an invalid directory) leaves the user on the form with the error; turning the setting off returns to the list on success. **Not run**: no simulator/device available in this environment — left for the user to confirm before relying on this in production.
