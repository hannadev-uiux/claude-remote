## Purpose

Installs and configures Claude Remote on the Mac with a single command and a guided wizard.

## ADDED Requirements

### Requirement: One-line installation
`install.sh` SHALL install or update the code in `~/.claude-remote/src`, build the daemon and open the wizard, failing with a clear message outside macOS, without Node 24+ or without git. Missing `tmux` and `ripgrep` MUST be installed via Homebrew when available.

#### Scenario: First installation
- **WHEN** the user runs `curl -fsSL https://maarkn.dev/claude-remote/install.sh | bash`
- **THEN** the code is downloaded and built, and the wizard starts

#### Scenario: Update
- **WHEN** the script runs with the code already installed and no local changes
- **THEN** the code moves to the requested ref and is rebuilt

#### Scenario: No terminal
- **WHEN** there is no `/dev/tty`
- **THEN** the setup runs without questions, using the detected profiles

### Requirement: Profile wizard
`claude-remote setup` SHALL show the logo, detect the Claude Code configuration directories, let the user choose the profiles and set the alias and name of each, and only write after confirmation. The alias MUST be valid, unique and different from `claude` and `claude-remote`.

#### Scenario: Two accounts
- **WHEN** `~/.claude` and `~/.claude-work` exist and the user chooses the aliases `personal` and `work`
- **THEN** `config.json` now has both profiles and the `personal` and `work` commands open each account's Claude Code in tmux

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
