## Why

Every profile talks to the Anthropic account logged into Claude Code. Issue #109 (epic #162) wants a profile that goes through OpenRouter instead: its billing and limits, models from several vendors, and the model picked from the phone. Claude Code already speaks to any Anthropic-compatible gateway through environment variables, so this is a profile attribute, not a new agent.

## What Changes

- **Protocol**: `Profile.provider` (`kind` `openrouter`, optional `baseUrl`, default `model` and `smallFastModel`), `ModelInfo` and `ProviderCredits`; `models.list` → `models.results`, `provider.status` → `provider.info`; `session.start` takes an optional `model`.
- **Daemon**: `features/providers/` (gateway environment, model catalog with a one-hour cache kept on disk, credits); the launcher exports the provider variables and reads the key from the OS secret store only inside the tmux window; `remote-harness provider key <profile>` stores the key next to the pairing token (Keychain, Secret Service or `0600` file); `doctor` reports it; `session.start` with a model adds `--model`.
- **App**: dashed `via OpenRouter` chip on profile rows, in the session context line and in Settings → Profiles; a Model row and a searchable picker in New session (context, price, capabilities, credits); `Change model…` in the session menu sends `/model <id>` to a running session.

## Non-goals (kept on #109)

A setup-wizard step for OpenRouter profiles (the config is edited by hand for now); Codex through OpenRouter (#108); OpenRouter usage in the live status; checking which models really work with Claude Code (the picker warns from the catalog's capability flags only).

## Capabilities

### New
- `model-providers`

### Modified
- `daemon-config`, `launchers`, `session-lifecycle`, `protocol`, `app-conversation`, `app-shell`

## Impact

`packages/protocol` (domain, client, server); `apps/daemon` (`core/secrets`, `core/paths`, `cli`, `features/hooks/launcher`, `features/lifecycle`, `features/providers`, i18n); `apps/mobile` (`features/providers`, `features/lifecycle`, `features/session-status`, `features/settings`, `features/conversation/session-menu`, `ui/ProviderChip`, i18n); README.
