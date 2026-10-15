## MODIFIED Requirements

### Requirement: Idempotent hook installation
The installer SHALL merge into each profile's `settings.json` HTTP hooks for `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`, `SubagentStop`, `Notification` and `PermissionRequest` pointing to the local daemon, preserving all other keys and hooks in the file. Running the installer twice MUST produce the same file.

#### Scenario: settings.json with user hooks
- **WHEN** the profile already has its own `Stop` hook
- **THEN** the user's hook stays there and the daemon's hook is added alongside it

#### Scenario: Reinstall
- **WHEN** the installer runs a second time
- **THEN** no hook is duplicated

#### Scenario: Backup
- **WHEN** the installer changes a `settings.json`
- **THEN** a copy `settings.json.bak-claude-remote` is written first
