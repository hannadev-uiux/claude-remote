## 1. Protocol

- [x] 1.1 `PushModeSchema`, `auth.ok.push`, `push.test`, `push.testResult` with tests

## 2. Daemon

- [x] 2.1 Config `push`, `resolvePushMode`, `SwitchablePushSender` with tests
- [x] 2.2 `push.test` handler, `/admin/push-mode` and `/admin/push-test`, hello `push.mode`, with tests
- [x] 2.3 CLI `push status|on|off|test` and `doctor` line; i18n in the three locales

## 3. App

- [x] 3.1 Push state store fed by `use-push`; test banner in the foreground
- [x] 3.2 `pushSummary` with tests; `PushCard` in Settings (mode, phone state, test, open settings)
- [x] 3.3 Catalog keys in en-US, pt-BR and es-ES

## 4. Docs and verification

- [x] 4.1 README (en, pt-BR): modes, opt-out, what the relay sees
- [x] 4.2 `pnpm check` green, iOS export bundles; `push status|off|test|on` run against an isolated dev daemon (mode switched live, `off` and `unregistered` results)
