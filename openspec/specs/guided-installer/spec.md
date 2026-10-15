# guided-installer Specification

## Purpose
Installs and configures Claude Remote on the Mac with a single command and a guided wizard.

## Requirements

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

### Requirement: Profile wizard
`claude-remote setup` SHALL show the logo, detect the Claude Code configuration directories, let the user choose the profiles and set the alias and name of each, and only write after confirmation. The alias MUST be valid, unique and different from `claude` and `claude-remote`.

#### Scenario: Two accounts
- **WHEN** `~/.claude` and `~/.claude-work` exist and the user chooses the aliases `personal` and `work`
- **THEN** `config.json` now has both profiles and the `personal` and `work` commands open each account's Claude Code in tmux

#### Scenario: New account
- **WHEN** the user chooses "Create a new account" and enters the folder (suggested `~/.claude-trabalho`)
- **THEN** the wizard creates the folder, opens Claude Code with `CLAUDE_CONFIG_DIR` pointing to it for login, checks the login when the user returns (`oauthAccount` or `primaryApiKey` in `.claude.json`) and adds the account to the list; without a login, it offers to open it again, add it anyway or discard it

#### Scenario: No accounts found
- **WHEN** no configuration directory exists and the wizard is interactive
- **THEN** it offers to create a new account instead of exiting

#### Scenario: Another tool's directory
- **WHEN** `~/.claude-mem` (claude-mem plugin) exists, or a `~/.claude-*` without `settings.json`, `.claude.json`, `.credentials.json` or `projects/`
- **THEN** it is not offered as an account

#### Scenario: Invalid alias
- **WHEN** the user types `claude` as the alias
- **THEN** the wizard rejects it and asks for another

#### Scenario: Profile removed
- **WHEN** a configured profile is unselected
- **THEN** its launcher and hooks are removed

### Requirement: Installer redirect
`https://maarkn.dev/claude-remote/install.sh` SHALL temporarily redirect to the `install.sh` on the `main` branch on GitHub.

#### Scenario: curl
- **WHEN** `curl -fsSL https://maarkn.dev/claude-remote/install.sh` is run
- **THEN** the script content is downloaded

### Requirement: Tutorial in the app
The pairing screen SHALL offer a step-by-step guide for those who installed the app before setting up the Mac: install Tailscale on the iPhone (App Store link) and on the Mac with the same account, install Claude Remote on the Mac with the one-line command (which can be shared, for example via AirDrop), and pair via the QR code.

#### Scenario: App installed first
- **WHEN** the user opens the app without pairing and taps "First time? Set up your Mac"
- **THEN** they see the steps in order, with the install command ready to share and a shortcut back to the QR scanner

### Requirement: Update command
`claude-remote update [--ref <ref>] [--force]` SHALL update an installation made by the installer: fetch the ref (default `main`) into `~/.claude-remote/src`, run the new `install.sh --update` (checks, dependencies and build without the wizard), refresh launchers, shortcut, PATH and hooks idempotently, restart the background service only when it is installed, and print the old and new version. It MUST NOT ask setup questions or show the pairing code, MUST refuse a checkout other than the installer's or one with local changes, and SHALL say when the installation is already up to date.

#### Scenario: New version available
- **WHEN** the user runs `claude-remote update` and `main` has new commits
- **THEN** the code is rebuilt, the service is restarted and the CLI prints `0.3.0 → 0.3.1`

#### Scenario: Already up to date
- **WHEN** the fetched commit is the installed one
- **THEN** nothing is rebuilt and the CLI says it is up to date (unless `--force`)

#### Scenario: Development checkout
- **WHEN** the CLI runs from a clone outside `~/.claude-remote/src`
- **THEN** it refuses and suggests `git pull` and a build

#### Scenario: Installer only
- **WHEN** the user runs `curl -fsSL https://maarkn.dev/claude-remote/install.sh | bash -s -- --update`
- **THEN** the update runs the same way, without the wizard
