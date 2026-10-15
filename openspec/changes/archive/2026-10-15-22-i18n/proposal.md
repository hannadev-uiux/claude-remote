## Why

Every user-facing string is hard-coded in Brazilian Portuguese. The repository is public and the installer is the first contact for new users, so the Mac side and the app must speak English and Spanish too, and the setup must let the user choose.

## What Changes

- **Daemon/CLI**: typed message catalogs for `pt-BR`, `en-US` and `es-ES` with a small `t()` helper. The language comes from `config.json` (`language`), falling back to the system locale (`LC_ALL`/`LC_MESSAGES`/`LANG`) and then `en-US`. The setup wizard, CLI commands (`doctor`, `pair`, `install`, `service`, errors) and push notification texts use it.
- **Setup**: the first question of `claude-remote setup` is the language (default: the detected one); the choice is saved in `config.json`. `--yes` keeps the saved language or uses the detected one. `--lang <code>` sets it without asking.
- **`install.sh`**: its own messages in the three languages, chosen from the system locale.
- **App**: `i18next` + `react-i18next` + `expo-localization`; the app follows the iPhone language (`pt-*` → `pt-BR`, `es-*` → `es-ES`, anything else → `en-US`). All screens, components and pure helpers that produce text use the catalogs. iOS declares the three localizations.
- **OpenSpec**: artifacts are always written in English; existing specs and archived changes are rewritten in English (no behavior change).

## Capabilities

### New Capabilities
- `i18n`: languages, catalogs, language selection in the daemon/setup and in the app.

### Modified Capabilities

## Impact

`apps/daemon` (core i18n, setup, CLI, push), `install.sh`, `apps/mobile` (new native dependency `expo-localization`, so a new development build is needed), `CLAUDE.md`, `CONTRIBUTING.md`, `openspec/`.
