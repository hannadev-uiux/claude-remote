## MODIFIED Requirements

### Requirement: Login item identity
The LaunchAgent SHALL run the daemon through a `~/.remote-harness/Remote Harness.app` bundle (ad-hoc signed, with the app icon), so that macOS shows "Remote Harness" — and not Node's signer — in Login Items and in the background activity notice. The LaunchAgent's `ProgramArguments` SHALL be the bundle executable followed by node, `cli.js`, `start` and `--wait-tailscale`; the bundle MUST NOT contain those paths. Installing SHALL remove a `Claude Remote.app` left by older versions. `service uninstall` MUST remove the bundle.

#### Scenario: Background activity notice
- **WHEN** the service is installed
- **THEN** macOS identifies the item as "Remote Harness"

#### Scenario: Old bundle
- **WHEN** the service is installed over an install that had `Claude Remote.app`
- **THEN** only `Remote Harness.app` remains and the LaunchAgent runs it

## ADDED Requirements

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
