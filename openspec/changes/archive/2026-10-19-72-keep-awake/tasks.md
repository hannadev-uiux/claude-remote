## 1. Daemon

- [x] 1.1 `keepAwake` in the config schema; `features/power/policy.ts` (`isActive`, `keepAwakeDecision`) with tests
- [x] 1.2 `infra/power.ts`: helper command per platform and the spawned inhibitor (early-exit detection, stdin EOF, release); tests for the commands
- [x] 1.3 `features/power/index.ts`: controller on session changes and grace timer, re-acquire, release on stop, `GET /power`, `POST /admin/keep-awake-reload`; wired in `main.ts` for the service daemon only; tests with a fake inhibitor
- [x] 1.4 CLI `keep-awake [mode]` and the `doctor` checks (mode, held, helper, Mac laptop lid note); i18n in pt-BR, en-US, es-ES

## 2. App

- [x] 2.1 `DaemonClient` connect timeout and `unreachable` flag; store and `ConnectionBanner` "asleep or offline" text in three languages; tests

## 3. Docs and verification

- [x] 3.1 Troubleshooting "The computer sleeps or locks" in three languages
- [x] 3.2 `pnpm check` green; on this Mac, `pmset -g assertions` shows the caffeinate assertion while a session runs and drops it after `keep-awake off`
