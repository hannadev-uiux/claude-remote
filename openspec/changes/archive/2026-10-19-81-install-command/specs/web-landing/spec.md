## MODIFIED Requirements

### Requirement: Install section
The install section SHALL show the install command per operating system in tabs (macOS · Linux with `curl -fsSL https://remoteharness.app/install | bash`, Windows with `irm https://remoteharness.app/install | iex`), each with a copy button, the Windows tab preselected on Windows browsers, the requirements as chips (Node 24+ bundled when missing, tmux, git, ripgrep, Tailscale, `claude` on PATH), and the app cards (iPhone & iPad, Android) with the current way to get each build. Both commands MUST be present in the markup so the section works without JavaScript.

#### Scenario: Copy the command
- **WHEN** the visitor taps Copy next to the macOS · Linux command
- **THEN** the command is on the clipboard and the button briefly reads the translated "Copied"

#### Scenario: Windows visitor
- **WHEN** the page is opened from a Windows browser
- **THEN** the Windows tab is selected first

### Requirement: Other paths
The Worker SHALL keep the updates proxy and the iPhone install link exactly as they are, SHALL answer `/install`, `/install.sh` and `/install.ps1` as the installer URLs require, and SHALL answer every other path with a small branded 404 page in the negotiated language that links to the landing and the repository.

#### Scenario: Old redirect path
- **WHEN** someone opens `/anything-else`
- **THEN** a 404 page in their language is returned, with links home and to GitHub

#### Scenario: Installer through the Worker
- **WHEN** `curl -fsSL https://remoteharness.app/install.sh` reaches the Worker
- **THEN** it receives the bundled `install.sh` as `text/plain`, without a redirect
