## Why

OpenRouter profiles (#109) are configured by hand: the user edits `~/.remote-harness/config.json` to add a `provider`, runs `remote-harness install` to regenerate the launchers and `remote-harness provider key <profile>` to store the key. The guided setup (`remote-harness setup`) only knows Claude Code accounts, so the feature is invisible to anyone who does not read the docs (#191).

## What Changes

- The accounts step of the wizard offers **"Add an OpenRouter profile"** next to "Create a new account" and "Add a folder that already exists". It asks the name, the alias (same rules and PATH clash check as accounts), the config folder (suggested `~/.claude-openrouter`, created like a new account, no login needed) and an optional default model.
- The key is asked with a hidden prompt and stored with `providerKeyStore` (the same code `remote-harness provider key` uses), after the user confirms the summary and the config is written. It never goes to a file we write, an argument or the log. Leaving it empty skips it and prints the `provider key` command to run later.
- The key is checked against the gateway: `GET /v1/credits` (credits left shown when it answers), falling back to `GET /v1/key` because OpenRouter answers `/v1/credits` only for management keys. A rejected key (401) offers to type it again, keep it anyway or skip it; an unreachable gateway only warns.
- Running `remote-harness setup` again lists the provider profiles (with whether a key is stored) and, for each, offers keep, replace the key or remove the profile. Removing it removes its launcher and hooks (as for accounts) and its key from the secret store. Provider profiles' folders are no longer offered in the Claude Code accounts checkbox.
- The summary box marks provider profiles with `via OpenRouter`.
- Texts in pt-BR, en-US and es-ES; docs pages `daemon` and `getting-started` updated in the three languages.
- Secret stores gain `delete()` (Keychain `delete-generic-password`, `secret-tool clear`, file removal).

## Capabilities

### New Capabilities

### Modified Capabilities
- `guided-installer`: the wizard adds, lists, re-keys and removes OpenRouter profiles.
- `model-providers`: provider keys can be checked against the gateway and are removed with their profile.

## Impact

- `apps/daemon/src/features/setup/wizard.ts`: provider step inside the accounts step; keys stored/removed in the install step.
- `apps/daemon/src/features/setup/profiles.ts`: `suggestProviderProfile`, `suggestProviderConfigDir` (pure, tested).
- `apps/daemon/src/features/providers/key-check.ts` (new): `checkProviderKey` (pure over an injected fetch, tested).
- `apps/daemon/src/core/secrets.ts`: `SecretStore` with `delete()`; `providerKeyStore` returns it.
- `apps/daemon/src/cli.ts`: injects the provider key store, its label and `fetch` into the wizard.
- `apps/daemon/src/core/i18n/*`: new `setup.provider` texts.
- `apps/web/content/*/daemon.md`, `getting-started.md`.
- No protocol change.
