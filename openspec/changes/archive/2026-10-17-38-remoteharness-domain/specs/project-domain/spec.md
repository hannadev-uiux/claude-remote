## ADDED Requirements

### Requirement: Installer URLs
`https://remoteharness.app/install.sh` and `https://remoteharness.app/install.ps1` SHALL redirect to the installers on the `main` branch, and every install command shown by the app, the daemon, the installers and the docs MUST use them.

#### Scenario: One-line install
- **WHEN** the user runs `curl -fsSL https://remoteharness.app/install.sh | bash`
- **THEN** the installer from `main` runs

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
