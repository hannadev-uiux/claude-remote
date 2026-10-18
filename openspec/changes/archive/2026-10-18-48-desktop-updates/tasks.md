## 1. Config and pure logic

- [x] 1.1 Config `update` and `tray`; `compareVersions`, `isQuietMoment`, `buildTrayMenu` with tests

## 2. Daemon

- [x] 2.1 `UpdateChecker` (rate limits, persisted state, notify once per commit, downgrade flag) with tests
- [x] 2.2 `infra/desktop.ts` (notify, open, terminal, detached update) and `infra/tray-helper.ts` (build/locate/spawn, JSON lines) with tests on a fake helper
- [x] 2.3 `updates` feature: timers, auto-update at quiet moments, tray actions, `/admin/updates-*` routes; `start` enables it outside `--dev`
- [x] 2.4 Tray helpers: `Tray.swift` (compiles, answers `ready`) and `tray.py` (syntax checked)

## 3. CLI and docs

- [x] 3.1 `update` follows the channel and warns on downgrade; `updates status|check|channel|auto`; i18n in the three locales
- [x] 3.2 README (en, pt-BR)

## 4. Verification

- [x] 4.1 `pnpm check` green (daemon 337); built CLI: `updates status|channel|auto|check` against the real remote (main and development) in a temp home; service-mode daemon spawned the compiled Swift helper, which exited with it
