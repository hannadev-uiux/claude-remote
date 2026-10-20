## ADDED Requirements

### Requirement: OpenRouter profiles in the wizard
The accounts step of `remote-harness setup` SHALL offer "Add an OpenRouter profile", which asks the name (default `OpenRouter`), the alias (same validation and PATH clash check as accounts), the config folder (default the first free of `~/.claude-openrouter`, `~/.claude-openrouter-2`…, created when missing, no login asked) and an optional default model, then the key in a hidden prompt. The key SHALL be checked against the gateway (see model-providers "Provider key check") and stored with the provider key store only after the summary is confirmed and the config written; an empty key MUST skip storing it and print the `remote-harness provider key <alias>` command. When the setup runs again, every configured provider profile SHALL be listed with whether its key is stored, offering keep, replace the key or remove the profile; its folder MUST NOT be offered in the Claude Code accounts checkbox. Removing a provider profile SHALL remove its launcher, its hooks and its stored key. All texts MUST be translated.

#### Scenario: Add an OpenRouter profile
- **WHEN** the user chooses "Add an OpenRouter profile", keeps the defaults, types a key the gateway accepts and confirms the summary
- **THEN** `config.json` has a profile `openrouter` with `provider: { kind: "openrouter" }` and folder `~/.claude-openrouter`, its launcher is installed, and the key is stored under `provider-openrouter` without being printed

#### Scenario: Rejected key
- **WHEN** the gateway answers 401 to the key
- **THEN** the wizard says the key was rejected and offers to type it again, keep it anyway or skip it

#### Scenario: Setup again
- **WHEN** the setup runs with a configured provider profile and the user chooses "Remove the profile"
- **THEN** the profile leaves `config.json`, its launcher and hooks are removed and its key is deleted from the secret store

#### Scenario: Replace the key
- **WHEN** the user chooses "Replace the key" for a provider profile and types a new key
- **THEN** the new key replaces the stored one and the profile is otherwise unchanged
