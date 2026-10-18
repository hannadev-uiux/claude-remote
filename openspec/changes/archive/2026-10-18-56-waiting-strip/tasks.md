## 1. Logic

- [x] 1.1 `features/permissions/strip.ts`: `pendingForStrip` (requests + waiting sessions, oldest first, distinct session count, next item) and `formatElapsed`, with tests

## 2. UI

- [x] 2.1 `WaitingStrip` (header with live elapsed time, oldest item, Deny / Always / Allow through `useRespond` and the always sheet, Open for questions/plans/waiting sessions, "+N more"), `useNow` hook, pinned above the list in `SessionsScreen`
- [x] 2.2 `permissions.strip.*` in pt-BR, en-US, es-ES

## 3. Verification

- [x] 3.1 `pnpm check` green (turbo typecheck + tests 10/10; Biome on `apps packages`); `npx expo export --platform ios` bundles
