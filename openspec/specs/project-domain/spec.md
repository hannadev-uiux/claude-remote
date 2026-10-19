# project-domain Specification

## Purpose
TBD - created by archiving change 38-remoteharness-domain. Update Purpose after archive.

## Requirements

### Requirement: Installer URLs
`https://remoteharness.app/install` SHALL answer with the installer for the client that asks: `install.ps1` to Windows PowerShell 5.1 and PowerShell 7, an HTML install page to browsers, and `install.sh` to every other client (curl, wget, unknown). `https://remoteharness.app/install.sh` and `https://remoteharness.app/install.ps1` SHALL keep answering their script. The Worker MUST serve the scripts bundled from the deployed commit as `text/plain; charset=utf-8` with `cache-control: no-cache`, not a redirect, and a valid `?ref=<branch|tag>` SHALL become the default version the script installs (flags and `REMOTE_HARNESS_REF` still win); an invalid ref MUST be answered with 400. Every install command shown by the app, the daemon, the installers, the README, the landing and the docs MUST be `curl -fsSL https://remoteharness.app/install | bash` or `irm https://remoteharness.app/install | iex`.

#### Scenario: One-line install
- **WHEN** the user runs `curl -fsSL https://remoteharness.app/install | bash`
- **THEN** `install.sh` is downloaded and runs

#### Scenario: One-line install on Windows
- **WHEN** the user runs `irm https://remoteharness.app/install | iex` in PowerShell 5.1 or 7
- **THEN** `install.ps1` is downloaded and runs

#### Scenario: Version from the query
- **WHEN** the user runs `curl -fsSL "https://remoteharness.app/install?ref=development" | bash`
- **THEN** the installer installs `development` unless `--ref` or `REMOTE_HARNESS_REF` say otherwise

#### Scenario: Invalid ref
- **WHEN** a request asks `/install?ref=../x`
- **THEN** the Worker answers 400 and no script

#### Scenario: Worker fallback
- **WHEN** a request for `/install.sh` or `/install.ps1` reaches the Worker
- **THEN** it receives that script, bundled from the deployed commit, with the same query handling as `/install`

### Requirement: Updates proxy
Requests to `https://remoteharness.app/api/updates/<path>` SHALL be forwarded to the Expo Updates server with the same method, headers, query and body, and its response returned unchanged.

#### Scenario: Manifest request
- **WHEN** a build made with `REMOTE_HARNESS_UPDATES_URL=https://remoteharness.app/api/updates/manifest` checks for updates
- **THEN** it receives the server's manifest for its runtime and channel

### Requirement: iPhone install link
`make install-ios-link IOS_LINK=web` SHALL upload the IPA, its manifest and the install page to `https://remoteharness.app/ios/<token>/`, where `<token>` is random and reused between builds. The Worker MUST serve only those three files and answer 404 to anything else.

#### Scenario: Install without Tailscale
- **WHEN** a registered iPhone opens the printed link in Safari and taps Install
- **THEN** the build installs over any network

#### Scenario: Unknown path
- **WHEN** someone requests `/ios/` or a token that does not exist
- **THEN** the Worker answers 404

### Requirement: Install page
A browser opening `https://remoteharness.app/install` SHALL get a page in the negotiated language (pt-BR, en-US, es-ES) that shows the command for the detected operating system first, with a copy button, and the commands of the other systems in a collapsed list. A phone or an unknown system SHALL see every command and a note to run it on the computer. The page MUST work without JavaScript.

#### Scenario: Windows browser
- **WHEN** the page is opened from Edge on Windows
- **THEN** the PowerShell command is shown first and the macOS · Linux · WSL one is in the collapsed list

#### Scenario: Phone
- **WHEN** the page is opened on an iPhone
- **THEN** both commands are shown, with a note that they run on the computer
