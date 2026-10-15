# hooks-integration Specification

## Purpose
Connects Claude Code sessions to the daemon through HTTP hooks installed in each profile.

## Requirements

### Requirement: Idempotent hook installation
The installer SHALL merge into each profile's `settings.json` HTTP hooks for `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`, `SubagentStop`, `Notification` and `PermissionRequest` pointing to the local daemon, preserving all other keys and hooks in the file. Since Claude Code only runs `command` hooks on `SessionStart`, that event SHALL use a `command` hook that sends the same JSON to the daemon with `curl`, without writing anything to stdout (which would go into Claude's context) and without failing the session. Running the installer twice MUST produce the same file.

#### Scenario: settings.json with user hooks
- **WHEN** the profile already has its own `Stop` hook
- **THEN** the user's hook stays there and the daemon's hook is added alongside it

#### Scenario: SessionStart via command
- **WHEN** a session starts or is resumed inside tmux
- **THEN** the daemon receives the `SessionStart` with the pane and the profile, and Claude receives no extra text in its context

#### Scenario: Reinstall
- **WHEN** the installer runs a second time
- **THEN** no hook is duplicated

#### Scenario: Backup
- **WHEN** the installer changes a `settings.json`
- **THEN** a copy `settings.json.bak-claude-remote` is written first

### Requirement: Uninstall
`uninstall` SHALL remove only the hooks, the `~/.zshrc` block and the launchers created by the installer.

#### Scenario: Clean removal
- **WHEN** the user runs `uninstall`
- **THEN** `settings.json` goes back to containing only the user's hooks

### Requirement: Event reception
The daemon SHALL accept `POST /hooks/<event>` with the Claude Code payload, identify the profile and the tmux pane from the headers sent by the hook, and publish the event internally. Non-permission events MUST be answered immediately with an empty body, without blocking the session.

#### Scenario: SessionStart from a launcher session
- **WHEN** `SessionStart` arrives with pane header `%12` and profile `claudin`
- **THEN** the daemon associates the `session_id` with pane `%12` and profile `claudin`

#### Scenario: Daemon down
- **WHEN** Claude Code fires a hook and the daemon is not running
- **THEN** the Claude session continues normally (the hook fails without blocking)
