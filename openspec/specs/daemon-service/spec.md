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
The LaunchAgent SHALL run the daemon through a `~/.remote-harness/Remote Harness.app` bundle (ad-hoc signed, with the app icon), so that macOS shows "Remote Harness" — and not Node's signer — in Login Items and in the background activity notice. The LaunchAgent's `ProgramArguments` SHALL be the bundle executable followed by node, `cli.js`, `start` and `--wait-tailscale`; the bundle MUST NOT contain those paths. Installing SHALL remove a `Claude Remote.app` left by older versions. `service uninstall` MUST remove the bundle.

#### Scenario: Background activity notice
- **WHEN** the service is installed
- **THEN** macOS identifies the item as "Remote Harness"

#### Scenario: Old bundle
- **WHEN** the service is installed over an install that had `Claude Remote.app`
- **THEN** only `Remote Harness.app` remains and the LaunchAgent runs it

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

### Requirement: Folder access attribution
When the Command Line Tools are available, the bundle executable SHALL be a compiled launcher that spawns the daemon as a child process (not `exec`), forwards SIGTERM, SIGINT, SIGHUP, SIGQUIT, SIGUSR1 and SIGUSR2 to it and exits with its status, so that macOS privacy prompts and grants name "Remote Harness". The bundle's `Info.plist` SHALL carry the Documents, Desktop, Downloads, removable and network volume usage descriptions, translated to pt-BR, en-US and es-ES. Reinstalling the service with unchanged launcher, icon and texts MUST leave the bundle untouched, so its signature and the grants survive `remote-harness update`. Without the Command Line Tools the bundle SHALL fall back to a script that execs the same arguments, and `doctor` SHALL report it with the fix.

#### Scenario: First access to Documents
- **WHEN** a session in `~/Documents/project` makes the daemon read the folder for the first time
- **THEN** macOS asks whether "Remote Harness" may access the Documents folder

#### Scenario: Update keeps the grant
- **WHEN** the user granted access and then runs `remote-harness update`
- **THEN** the bundle is not rebuilt and the daemon keeps the access without a new prompt

#### Scenario: Stop the service
- **WHEN** launchd stops the job
- **THEN** the launcher forwards SIGTERM, the daemon shuts down and no node process is left behind

#### Scenario: No Command Line Tools
- **WHEN** the service is installed on a Mac without the Command Line Tools
- **THEN** the daemon runs through the script fallback and `doctor` says to install them and reinstall the service

### Requirement: Keep awake
The service daemon SHALL prevent idle system sleep according to the `keepAwake` setting: `off` never, `sessions` (default) while any session is running or waiting and for 10 minutes after the last such activity, `always` while the daemon runs. It MUST use an OS helper that ends with the daemon (macOS `caffeinate -i -w`, Linux `systemd-inhibit --what=idle:sleep`, WSL `SetThreadExecutionState` through PowerShell), MUST NOT change power settings, and MUST release the assertion on stop. `remote-harness keep-awake [mode]` SHALL show or set the mode and apply it to the running daemon. `doctor` SHALL show the mode and whether the assertion is held, fail when the helper is unavailable, and on a Mac laptop note that closing the lid can still sleep. Development runs (`--dev`) MUST NOT hold it.

#### Scenario: Long turn while away
- **WHEN** a session is running and nobody touches the computer
- **THEN** the computer does not idle-sleep, while the display may turn off and the screen may lock

#### Scenario: Grace after the turn
- **WHEN** the last running session finishes
- **THEN** the assertion is kept for 10 minutes and released if no session becomes active meanwhile

#### Scenario: Mode off
- **WHEN** the user runs `remote-harness keep-awake off` while the assertion is held
- **THEN** the running daemon releases it and the computer may sleep normally

#### Scenario: Daemon crash
- **WHEN** the daemon process dies without cleanup
- **THEN** the helper ends with it and the computer is not left pinned awake

#### Scenario: Helper missing
- **WHEN** `systemd-inhibit` is unavailable or refused
- **THEN** the daemon keeps working, logs it once and `doctor` reports the keep-awake check as failed
