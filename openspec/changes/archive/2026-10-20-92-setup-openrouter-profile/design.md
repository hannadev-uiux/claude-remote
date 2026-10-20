## Context

`askProfiles` in `wizard.ts` builds the profile list from config folders: a checkbox of detected/configured folders, a loop to create or add folders, then alias and name per folder. `suggestProfile` already keeps an existing profile's fields (including `provider`) when its folder is selected again, but nothing in the wizard creates a `provider`, and a provider profile's folder (`~/.claude-openrouter`, which gets a `settings.json` from the hooks) shows up in the checkbox as if it were a Claude Code account.

## Goals / Non-Goals

**Goals:**
- Create an OpenRouter profile, with its key, without editing `config.json`.
- Re-running the setup manages existing provider profiles (keep, replace the key, remove).
- The key follows the same rules as `remote-harness provider key`.

**Non-Goals:**
- Picking the default model from the catalog in the terminal (the app has the picker; the field is free text and optional).
- `baseUrl` / `smallFastModel` in the wizard: advanced, still in `config.json`, and kept when the profile is kept.
- Non-interactive creation (`--yes`): provider profiles already configured are kept as they are.

## Decisions

- **Provider profiles are handled apart from the folder checkbox.** Existing profiles with a `provider` are taken out of `dirs` and the checkbox, then listed one by one with keep / replace key / remove. New ones are added from the same "how to add" menu as accounts. This keeps the folder-centric flow for accounts untouched and avoids a provider profile being silently dropped by unchecking a box.
- **Keys are held in memory until the install step.** The wizard only writes after the summary is confirmed; storing a key earlier would leave a secret behind when the user aborts. After `writeConfig`, new/replaced keys are stored and the keys of removed provider profiles are deleted; each prints one line with the store label, never the key.
- **`checkProviderKey` lives in `features/providers`** next to the OpenRouter client, takes the `ProviderFetch` type the service already uses, and returns `{ status: 'valid', credits }`, `{ status: 'invalid' }` or `{ status: 'unknown', reason }`. Order: `/v1/credits` (200 → valid with credits; 401 → invalid), else `/v1/key` (200 → valid without credits; 401 → invalid), else unknown. The wizard gets `fetch` injected, so tests never reach the network.
- **`SecretStore` extends `TokenStore` with `delete()`** instead of adding it to `TokenStore`, so the pairing token's fakes and callers are unchanged. Deleting a missing secret is not an error (Keychain exit 44, `secret-tool clear` is silent, file `rm -f`).
- **Defaults:** name `OpenRouter`, alias `openrouter` (then `openrouter-2`…), folder `~/.claude-openrouter` (then `~/.claude-openrouter-2`…), color from `PROFILE_COLORS` like accounts.

## Risks / Trade-offs

- [Regular OpenRouter keys never get credits from `/v1/credits`] → the check falls back to `/v1/key`, so a regular key is still reported as accepted; the wizard says the credits need a management key only implicitly, by not showing them.
- [The user removes a provider profile whose folder they still want] → only the launcher, hooks and key are removed, never the folder, same as accounts.
