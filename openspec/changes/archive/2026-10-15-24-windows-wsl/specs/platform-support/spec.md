## MODIFIED Requirements

### Requirement: Supported platforms
The daemon, the CLI and `install.sh` SHALL run on macOS and Linux with the same commands, and MUST fail with a clear message on other systems. On Windows they SHALL run inside WSL2, installed by `install.ps1`.

#### Scenario: Install on Ubuntu
- **WHEN** the user runs the one-line installer on Ubuntu without tmux and ripgrep
- **THEN** they are installed with apt, the daemon is built and the setup starts

#### Scenario: Unsupported system
- **WHEN** the daemon starts on an unsupported platform
- **THEN** it exits with a message listing the supported systems

#### Scenario: Windows without WSL
- **WHEN** the user runs `irm https://maarkn.dev/claude-remote/install.ps1 | iex` on Windows 11 without WSL
- **THEN** WSL2 with Ubuntu is installed, the user is told to reboot if required, and running the command again continues with the Linux installer inside WSL

## ADDED Requirements

### Requirement: WSL networking
Inside WSL the setup SHALL find a Tailscale address either from Tailscale running in WSL or from mirrored networking, and MUST explain how to enable one of them when none is found.

#### Scenario: Tailscale only on Windows
- **WHEN** Tailscale runs on Windows, WSL uses NAT networking and the user accepts mirrored networking
- **THEN** `networkingMode=mirrored` is merged into `.wslconfig` (with a backup) and the user is told to run `wsl --shutdown`

### Requirement: Daemon running on Windows logon
On WSL the setup SHALL offer systemd in WSL and an optional logon task so the daemon runs without opening a terminal.

#### Scenario: Logon task
- **WHEN** the user accepts the logon task
- **THEN** a "Claude Remote" scheduled task starts the WSL distribution at logon and `service uninstall` removes it
