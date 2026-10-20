# platform-support Specification

## Purpose
Runs the daemon, the CLI and the installer on the supported operating systems, with per-platform adapters for secrets, the background service, the shell PATH and packages.

## Requirements

### Requirement: Supported platforms
The daemon, the CLI and `install.sh` SHALL run on macOS and Linux with the same commands, and MUST fail with a clear message on other systems. On Windows they SHALL run inside WSL2, installed by `install.ps1`.

#### Scenario: Install on Ubuntu
- **WHEN** the user runs the one-line installer on Ubuntu without tmux and ripgrep
- **THEN** they are installed with apt, the daemon is built and the setup starts

#### Scenario: Unsupported system
- **WHEN** the daemon starts on an unsupported platform
- **THEN** it exits with a message listing the supported systems

#### Scenario: Windows without WSL
- **WHEN** the user runs `irm https://remoteharness.app/install.ps1 | iex` on Windows 11 without WSL
- **THEN** WSL2 with Ubuntu is installed, the user is told to reboot if required, and running the command again continues with the Linux installer inside WSL

### Requirement: Secret storage per platform
The pairing token SHALL be stored in the macOS Keychain on macOS and in the Secret Service (`secret-tool`) on Linux when available, otherwise in a `0600` file. The token MUST NOT appear in process arguments.

#### Scenario: Headless Linux
- **WHEN** `secret-tool` is missing or there is no Secret Service
- **THEN** the token is stored in `~/.remote-harness/token` with mode `0600` and `doctor` reports the file store

### Requirement: Background service per platform
`remote-harness service install` SHALL install a launchd LaunchAgent on macOS and a systemd user unit on Linux, both restarting the daemon when it stops; on Linux the setup MUST offer to enable lingering.

#### Scenario: systemd user unit
- **WHEN** the user accepts the service on Linux
- **THEN** `~/.config/systemd/user/claude-remote.service` is written, enabled and started, and `remote-harness service status` shows it running

### Requirement: Shell PATH
The setup SHALL add the launcher directory to the PATH in the user's zsh and/or bash startup files, idempotently, with a backup and an atomic write.

#### Scenario: Bash user
- **WHEN** `$SHELL` is bash and `~/.zshrc` does not exist
- **THEN** only `~/.bashrc` receives the PATH block

### Requirement: WSL networking
Inside WSL the setup SHALL find a Tailscale address either from Tailscale running in WSL or from mirrored networking, and MUST explain how to enable one of them when none is found.

#### Scenario: Tailscale only on Windows
- **WHEN** Tailscale runs on Windows, WSL uses NAT networking and the user accepts mirrored networking
- **THEN** `networkingMode=mirrored` is merged into `.wslconfig` (with a backup) and the user is told to run `wsl --shutdown`

### Requirement: Daemon running on Windows logon
On WSL the setup SHALL offer systemd in WSL and an optional logon task so the daemon runs without opening a terminal. The task SHALL be named "Remote Harness"; a task named "Claude Remote" (created before the rename) SHALL count as the logon task, be deleted when the task is created again and be removed by `service uninstall` too.

#### Scenario: Logon task
- **WHEN** the user accepts the logon task
- **THEN** a "Remote Harness" scheduled task starts the WSL distribution at logon and `service uninstall` removes it

#### Scenario: Task from before the rename
- **WHEN** a machine has the "Claude Remote" task and the setup creates the logon task again
- **THEN** the "Remote Harness" task is created and the "Claude Remote" one is deleted
