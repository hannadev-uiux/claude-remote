## 1. Protocol

- [x] 1.1 `ProviderKindSchema`, `ProviderSchema`, `PROVIDER_NAMES`, `Profile.provider`; `ModelInfoSchema`, `ProviderCreditsSchema`; `models.list`, `provider.status` → `models.results`, `provider.info`; `session.start.model`; fixtures

## 2. Daemon

- [x] 2.1 `core/secrets.ts`: account-parameterized stores, `createSecretStore`, `providerKeyStore`; `paths.providerKey`, `paths.modelsCache`
- [x] 2.2 `features/providers/`: `providerEnv`, `parseModels`, `parseCredits`, `ProviderService` (cache, stale fallback, status), handlers; wired in `main.ts` with `DaemonOptions.providerKey`
- [x] 2.3 Launcher: provider exports, `CLAUDE_REMOTE_EXEC` self-exec reading the key, missing-key check (translated message through the installer)
- [x] 2.4 Lifecycle: `session.start.model` → `--model`
- [x] 2.5 CLI: `provider key <profile>` (`--stdin`), `doctor` provider lines; catalogs in en-US, pt-BR, es-ES
- [x] 2.6 Tests: providers (parsers, cache, status), launcher rendering and a real run of the exec path, lifecycle model arg, secrets accounts

## 3. App

- [x] 3.1 `features/providers/logic.ts` + tests; `use-provider.ts` queries; `ui/ProviderChip`
- [x] 3.2 `ModelPickerSheet`; New session Model row and `model` on start; profile rows with the chip
- [x] 3.3 Session screen: provider on the status bar, `Change model…` in the menu sending `/model`; `session-menu` tests
- [x] 3.4 Settings → Profiles: chip, provider, default model and credits in the details sheet
- [x] 3.5 Catalogs in pt-BR, en-US, es-ES (and the missing-interpolation handler no longer re-inserts the whole text for unknown variables)

## 4. Docs

- [x] 4.1 README: `provider` in `config.json`, `remote-harness provider key`

## 5. Verification

- [x] 5.1 `pnpm check` green (turbo + Biome in the worktree); `openspec validate --strict`; `npx expo export --platform ios` bundles
