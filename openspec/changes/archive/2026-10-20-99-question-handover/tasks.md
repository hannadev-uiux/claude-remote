## 1. Protocol

- [x] 1.1 `PermissionRequestInfoSchema.terminal` (optional), with a test.

## 2. Daemon

- [x] 2.1 `core/config.ts`: `questionTimeoutSec` (3300) and `hookTimeoutSec(config)`; `setup/install.ts` writes it (tests).
- [x] 2.2 `permissions/handover.ts`: pure rules (timeout per request, hook end → handover, what moves a session on, reminder delay), with tests.
- [x] 2.3 Broker: per-request timeout, `aborted` vs `cancelled`, handover with grace, end on watch / new request / `cancelAll`, `already_resolved` on handed-over requests, `denyAll` skips them, reminder timer (tests).
- [x] 2.4 `permissions/index.ts`: watch = transcript follow + session hooks; `permission.handover` / `permission.reminder` bus events; handover log without content.
- [x] 2.5 Push reminder (`push.questionReminder`, `push.planReminder`) and live status without lock-screen actions after a handover; daemon i18n.

## 3. App

- [x] 3.1 Store: replace the request's data on a repeated `permission.request` without repeating the haptic.
- [x] 3.2 `HandoverCard` in `SessionPermissions` (title and summary, "Answer in the terminal", Open terminal / answer on the computer); strip status without actions; i18n in pt-BR, en-US and es-ES.

## 4. Validation

- [x] 4.1 `pnpm check` green and `npx expo export --platform ios` bundles.
