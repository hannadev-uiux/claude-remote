## Purpose

Keeps the daemon running as a user service on macOS, starting at login and recovering from failures.

## ADDED Requirements

### Requirement: LaunchAgent
`service install` SHALL write and load a LaunchAgent with `RunAtLoad` and `KeepAlive`, using the absolute path of the current Node; `service uninstall` MUST unload and remove the file.

#### Scenario: Login
- **WHEN** the user logs in on the Mac
- **THEN** the daemon starts automatically

#### Scenario: Process crash
- **WHEN** the daemon process exits with an error
- **THEN** launchd restarts it

### Requirement: tmux restart
When the tmux server restarts, the daemon SHALL mark as ended the sessions whose panes disappeared and keep accepting new sessions without a restart.

#### Scenario: tmux kill-server
- **WHEN** the user runs `tmux kill-server`
- **THEN** the sessions show as ended and a new session started via a launcher is registered normally
