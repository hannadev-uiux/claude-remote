# daemon-service Specification

## Purpose
Keeps the daemon running as a user service on macOS, starting at login and recovering from failures.

## Requirements

### Requirement: LaunchAgent
`service install` SHALL write and load a LaunchAgent with `RunAtLoad` and `KeepAlive`, using the absolute path of the current Node; `service uninstall` MUST unload and remove the file.

#### Scenario: Login
- **WHEN** the user logs in on the Mac
- **THEN** the daemon starts automatically

#### Scenario: Process crash
- **WHEN** the daemon process exits with an error
- **THEN** launchd restarts it

### Requirement: Login item identity
The LaunchAgent SHALL run the daemon through a `~/.claude-remote/Claude Remote.app` bundle (ad-hoc signed, with the app icon), so that macOS shows "Claude Remote" — and not Node's signer — in Login Items and in the background activity notice. `service uninstall` MUST remove the bundle.

#### Scenario: Background activity notice
- **WHEN** the service is installed
- **THEN** macOS identifies the item as "Claude Remote"

### Requirement: Waiting for Tailscale
When running as a service, the daemon SHALL wait for the Tailscale interface to appear (polling periodically and logging a single warning) instead of exiting, avoiding a launchd restart loop. The hooks endpoint MUST stay available while waiting, so that Claude Code sessions never find the port closed.

#### Scenario: Login before Tailscale connects
- **WHEN** the service starts and there is no 100.x interface yet
- **THEN** the daemon waits and starts listening as soon as Tailscale connects

### Requirement: tmux restart
When the tmux server restarts, the daemon SHALL mark as ended the sessions whose panes disappeared and keep accepting new sessions without a restart.

#### Scenario: tmux kill-server
- **WHEN** the user runs `tmux kill-server`
- **THEN** the sessions show as ended and a new session started via a launcher is registered normally
