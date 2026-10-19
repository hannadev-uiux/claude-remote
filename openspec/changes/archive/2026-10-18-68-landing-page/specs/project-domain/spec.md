## MODIFIED Requirements

### Requirement: Installer URLs
`https://remoteharness.app/install.sh` and `https://remoteharness.app/install.ps1` SHALL redirect to the installers on the `main` branch (by the zone's redirect rules and, when a request reaches it, by the Worker itself), and every install command shown by the app, the daemon, the installers and the docs MUST use them.

#### Scenario: One-line install
- **WHEN** the user runs `curl -fsSL https://remoteharness.app/install.sh | bash`
- **THEN** the installer from `main` runs

#### Scenario: Worker fallback
- **WHEN** the zone rule is absent and the request for `/install.ps1` reaches the Worker
- **THEN** the Worker answers the same 302 to the raw file on `main`
