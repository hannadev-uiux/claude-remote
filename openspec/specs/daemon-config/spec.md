# daemon-config Specification

## Purpose
Allows configuring the Claude Code profiles (configuration directories) and the daemon parameters in a local file.

## Requirements

### Requirement: Configurable profiles
The daemon SHALL load profiles with `id`, `name`, `configDir`, `color` and an optional `agent` (`claude` when absent; `codex`, `kimi` and `qwen` are accepted ids) from `~/.remote-harness/config.json`. If the file is missing, it MUST create one with the default profiles `claudin` (`~/.claude`) and `drclaude` (`~/.claude-doctorx`). A profile whose agent has no adapter in this daemon MUST be ignored at start with a warning naming the profile and the agent, like a profile whose config dir is missing.

#### Scenario: First run
- **WHEN** the daemon starts without a configuration file
- **THEN** it creates the file with the two default profiles and keeps running

#### Scenario: Invalid configuration
- **WHEN** the file exists but has invalid JSON or a missing required field
- **THEN** the daemon exits with a message pointing to the invalid field

#### Scenario: Agent without an adapter
- **WHEN** a profile declares `agent: "codex"` and the daemon has no Codex adapter
- **THEN** the profile is left out with a warning and the other profiles load

### Requirement: Nonexistent profile directory
The daemon SHALL ignore profiles whose `configDir` does not exist, logging a warning.

#### Scenario: Profile without directory
- **WHEN** a profile points to a directory that does not exist
- **THEN** the profile does not appear in the list and a warning is logged
