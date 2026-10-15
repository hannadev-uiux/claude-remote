# platform-support Specification

## Purpose
Runs the daemon, the CLI and the installer on the supported operating systems, with per-platform adapters for secrets, the background service, the shell PATH and packages.

## Requirements

### Requirement: Supported platforms
The daemon, the CLI and `install.sh` SHALL run on macOS and Linux with the same commands, and MUST fail with a clear message on other systems.

#### Scenario: Install on Ubuntu
- **WHEN** the user runs the one-line installer on Ubuntu without tmux and ripgrep
- **THEN** they are installed with apt, the daemon is built and the setup starts

#### Scenario: Unsupported system
- **WHEN** the daemon starts on an unsupported platform
- **THEN** it exits with a message listing the supported systems

### Requirement: Secret storage per platform
The pairing token SHALL be stored in the macOS Keychain on macOS and in the Secret Service (`secret-tool`) on Linux when available, otherwise in a `0600` file. The token MUST NOT appear in process arguments.

#### Scenario: Headless Linux
- **WHEN** `secret-tool` is missing or there is no Secret Service
- **THEN** the token is stored in `~/.claude-remote/token` with mode `0600` and `doctor` reports the file store

### Requirement: Background service per platform
`claude-remote service install` SHALL install a launchd LaunchAgent on macOS and a systemd user unit on Linux, both restarting the daemon when it stops; on Linux the setup MUST offer to enable lingering.

#### Scenario: systemd user unit
- **WHEN** the user accepts the service on Linux
- **THEN** `~/.config/systemd/user/claude-remote.service` is written, enabled and started, and `claude-remote service status` shows it running

### Requirement: Shell PATH
The setup SHALL add the launcher directory to the PATH in the user's zsh and/or bash startup files, idempotently, with a backup and an atomic write.

#### Scenario: Bash user
- **WHEN** `$SHELL` is bash and `~/.zshrc` does not exist
- **THEN** only `~/.bashrc` receives the PATH block
