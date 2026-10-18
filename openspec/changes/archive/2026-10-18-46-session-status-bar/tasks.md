## 1. Protocol

- [x] 1.1 `SessionStatusSchema`, `Session.status`, `AccountLimitsSchema`, `limits.updated` with tests

## 2. Daemon

- [x] 2.1 `parseStatusLine` with tests
- [x] 2.2 `renderStatusLineScript`, `wrapStatusLine` / `unwrapStatusLine` with tests; shell check of the script (forwarding and original output)
- [x] 2.3 Install / uninstall wiring (script file, every profile's `settings.json`), installer i18n line
- [x] 2.4 `status-line` feature: `/statusline` route, session status without bumping `updatedAt`, pending statuses, per-profile limits with `limits.updated` and replay on connect, with tests

## 3. App

- [x] 3.1 `session-status/logic.ts` (items, levels, tokens, reset formatting, expiry) with tests
- [x] 3.2 Limits store bound to the client; `StatusBar` and `StatusSheet`; session route wiring
- [x] 3.3 Catalog keys in en-US, pt-BR and es-ES

## 4. Verification

- [x] 4.1 `pnpm check` green (protocol 86, daemon 311 + script run against a real hooks server, mobile 291), iOS export bundles
