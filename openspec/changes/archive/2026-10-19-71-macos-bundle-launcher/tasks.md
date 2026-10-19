## 1. Launcher

- [x] 1.1 `apps/daemon/macos/launcher.c` (spawn, signal forwarding, exit status) and `infra/native-build.ts` (CLT check, `cc` build cached by source hash); tests

## 2. Bundle

- [x] 2.1 `launchd.ts`: "Remote Harness" names, `ProgramArguments` with node and `cli.js`, compiled launcher or `exec "$@"` fallback, usage descriptions with `InfoPlist.strings` in three languages, stamp that skips unchanged rebuilds, legacy bundle removal; `paths.app()`; tests
- [x] 2.2 `doctor` (macOS): launcher kind check and Full Disk Access hint; i18n in pt-BR, en-US, es-ES

## 3. Verification

- [x] 3.1 `pnpm check` green; the launcher compiles, forwards SIGTERM and returns the child's exit code (local run)
