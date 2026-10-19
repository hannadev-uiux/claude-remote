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
