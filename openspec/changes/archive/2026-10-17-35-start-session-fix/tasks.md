## 1. Daemon

- [x] 1.1 `LifecycleService.start` checks the pane after `settleMs` and fails with `internal` when it closed; English launcher failure message; tests
- [x] 1.2 `session.start` handler logs accepted (`info`) and rejected (`warn`) starts

## 2. App

- [x] 2.1 Pure `planStart` and `withTimeout` in `features/lifecycle/start-plan.ts` with Vitest tests
- [x] 2.2 `NewSessionScreen`: busy from the first tap, capped inspection, plan-driven confirm/launch, translated error mapping
- [x] 2.3 i18n keys in pt-BR, en-US and es-ES

## 3. Verification

- [x] 3.1 Reproduce `session.start` against an isolated daemon (WS client) before and after the change
- [x] 3.2 `pnpm check` green (daemon 255, mobile 184 tests) and `npx expo export --platform ios` bundles
