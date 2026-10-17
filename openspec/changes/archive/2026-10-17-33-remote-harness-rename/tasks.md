## 1. Daemon

- [x] 1.1 `core/env.ts` resolver (`REMOTE_HARNESS_*` then `CLAUDE_REMOTE_*`) with tests; used by every variable the daemon reads
- [x] 1.2 Data directory resolution with legacy fallback in `core/paths.ts`, with tests
- [x] 1.3 CLI named `remote-harness`, `claude-remote` alias in `bin` and in the installed shortcuts
- [x] 1.4 Product name in the daemon i18n catalogs, systemd description and permission messages

## 2. Packages and tooling

- [x] 2.1 Rename the workspace packages and imports, refresh the lockfile
- [x] 2.2 `install.sh`, `install.ps1`, Makefile, CI workflows and scripts with the new names and env fallback

## 3. App

- [x] 3.1 App name, iOS permission texts and UI strings say Remote Harness (identity untouched)
- [x] 3.2 OTA build/publish variables with env fallback

## 4. Docs and repository

- [x] 4.1 README, CLAUDE.md, AGENTS.md, docs and living specs
- [x] 4.2 Rename the GitHub repository and the default repo URL

## 5. Verification

- [x] 5.1 `pnpm check` green and `npx expo export --platform ios` bundles
