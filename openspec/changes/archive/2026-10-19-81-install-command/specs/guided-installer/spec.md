## MODIFIED Requirements

### Requirement: Installer redirect
`https://remoteharness.app/install` SHALL deliver `install.sh` to curl and wget (macOS, Linux, WSL), and `install.sh` started from Git Bash, MSYS or Cygwin on Windows MUST stop with a message that shows `irm https://remoteharness.app/install | iex`.

#### Scenario: curl
- **WHEN** `curl -fsSL https://remoteharness.app/install` is run
- **THEN** the script content is downloaded

#### Scenario: Git Bash on Windows
- **WHEN** the user runs `curl -fsSL https://remoteharness.app/install | bash` in Git Bash
- **THEN** the installer stops and prints the PowerShell command

### Requirement: Tutorial in the app
The pairing screen SHALL offer a step-by-step guide for those who installed the app before setting up the computer: install Tailscale on the phone (store link) and on the computer with the same account, install Remote Harness on the computer with the one-line command `curl -fsSL https://remoteharness.app/install | bash` (the Windows command `irm https://remoteharness.app/install | iex` is named in the step), with a share action that sends `https://remoteharness.app/install` (which shows the right command for the computer that opens it), and pair via the QR code.

#### Scenario: App installed first
- **WHEN** the user opens the app without pairing and taps "First time? Set up your computer"
- **THEN** they see the steps in order, with the install command and the install link ready to share and a shortcut back to the QR scanner
