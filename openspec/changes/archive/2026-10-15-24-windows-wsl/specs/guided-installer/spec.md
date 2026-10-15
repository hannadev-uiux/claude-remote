## MODIFIED Requirements

### Requirement: One-line installation
`install.sh` SHALL install or update the code in `~/.claude-remote/src`, build the daemon and open the wizard, failing with a clear message on unsupported systems or without git. Missing `tmux` and `ripgrep` MUST be installed via Homebrew when available. When Node 24+ is missing, it SHALL download the latest Node 24 from nodejs.org into `~/.claude-remote/node`, verify its SHA-256 against the official `SHASUMS256.txt`, and use it only for Claude Remote, without changing the user's shell or system Node.

#### Scenario: First installation
- **WHEN** the user runs `curl -fsSL https://maarkn.dev/claude-remote/install.sh | bash`
- **THEN** the code is downloaded and built, and the wizard starts

#### Scenario: Update
- **WHEN** the script runs with the code already installed and no local changes
- **THEN** the code moves to the requested ref and is rebuilt

#### Scenario: No terminal
- **WHEN** there is no `/dev/tty`
- **THEN** the setup runs without questions, using the detected profiles

#### Scenario: Fresh system without Node
- **WHEN** the installer runs on a fresh Ubuntu (for example inside WSL) without Node
- **THEN** Node 24 is downloaded into `~/.claude-remote/node` after its checksum is verified, and the daemon, the `claude-remote` shortcut and the service use it
