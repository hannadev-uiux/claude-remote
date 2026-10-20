# daemon-config Specification

## Purpose
Allows configuring the Claude Code profiles (configuration directories) and the daemon parameters in a local file.

## Requirements

### Requirement: Configurable profiles
The daemon SHALL load profiles with `id`, `name`, `configDir`, `color`, an optional `agent` (`claude` when absent; `codex`, `kimi` and `qwen` are accepted ids) and an optional `provider` from `~/.remote-harness/config.json`. A `provider` has `kind` (`openrouter`), an optional `baseUrl` (the gateway's Anthropic-compatible endpoint; `https://openrouter.ai/api` when absent), an optional default `model` and an optional `smallFastModel`; a profile without `provider` uses the Anthropic account logged into Claude Code. If the file is missing, the daemon MUST create one with the default profiles `claudin` (`~/.claude`) and `drclaude` (`~/.claude-doctorx`). A profile whose agent has no adapter in this daemon MUST be ignored at start with a warning naming the profile and the agent, like a profile whose config dir is missing.

#### Scenario: First run
- **WHEN** the daemon starts without a configuration file
- **THEN** it creates the file with the two default profiles and keeps running

#### Scenario: Invalid configuration
- **WHEN** the file exists but has invalid JSON or a missing required field
- **THEN** the daemon exits with a message pointing to the invalid field

#### Scenario: Agent without an adapter
- **WHEN** a profile declares `agent: "codex"` and the daemon has no Codex adapter
- **THEN** the profile is left out with a warning and the other profiles load

#### Scenario: OpenRouter profile
- **WHEN** a profile declares `"provider": { "kind": "openrouter", "model": "anthropic/claude-sonnet-5.5" }`
- **THEN** the profile loads with that provider and the app receives it in `auth.ok`

### Requirement: Nonexistent profile directory
The daemon SHALL ignore profiles whose `configDir` does not exist, logging a warning.

#### Scenario: Profile without directory
- **WHEN** a profile points to a directory that does not exist
- **THEN** the profile does not appear in the list and a warning is logged

### Requirement: Agent binary required for the app to offer a profile
The profile list the daemon sends in `auth.ok` SHALL exclude any profile whose agent's CLI (`claude`, `codex`, …) cannot be resolved on the daemon's PATH, logging a warning naming the profile and the agent. This check is narrower than the adapter/config-dir checks of "Configurable profiles" and "Nonexistent profile directory": it only affects what `auth.ok` offers to the app, not the full profile list `resolveProfiles` returns to `install`, `uninstall`, `remote-harness update` or the running `LifecycleService`, so installing or removing a profile's launcher still works before its CLI is on PATH.

#### Scenario: Codex profile without the binary
- **WHEN** a Codex profile is configured but `codex` is not on the daemon's PATH
- **THEN** `auth.ok` does not list that profile, and the daemon logs a warning naming the profile and `codex`

#### Scenario: Binary appears later
- **WHEN** `codex` is later installed and the daemon restarts
- **THEN** `auth.ok` lists the profile again

#### Scenario: Install is unaffected
- **WHEN** `remote-harness install` runs for a Codex profile whose CLI is not yet on PATH
- **THEN** the profile's launcher is still created, unaffected by this check
