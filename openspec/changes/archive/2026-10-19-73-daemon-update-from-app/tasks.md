## 1. Protocol

- [x] 1.1 `DaemonUpdateInfo`, `DaemonUpdateRun` in the domain; `daemon.update.check`, `daemon.update.start`, `daemon.update.info`; optional `auth.ok.update`; fixtures

## 2. Daemon

- [x] 2.1 `features/updates/run.ts`: run record (read, write, reconcile at start, step helpers) with tests
- [x] 2.2 CLI `update`: record the steps, roll back and rebuild the previous commit when the build fails; `update --finish` records `restarting`
- [x] 2.3 `features/updates/remote.ts`: handlers, guards, info builder, polling and broadcast; wired from the updates feature (service daemon) and a blocked stub otherwise; `auth.ok.update`; tests

## 3. App

- [x] 3.1 `daemon-update.ts` pure helpers (step labels, confirmation kind) with tests; `DaemonUpdateCard` in Settings; i18n in pt-BR, en-US, es-ES

## 4. Verification

- [x] 4.1 `pnpm check` green; rollback exercised in a temp git checkout
