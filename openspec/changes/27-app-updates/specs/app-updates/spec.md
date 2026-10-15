## ADDED Requirements

### Requirement: Over-the-air updates
The app SHALL check for updates with `expo-updates` at launch and when returning to the foreground (at most every 30 minutes), download them in the background and apply them on the next cold start. Updates MUST only apply to binaries with the same runtime version (fingerprint policy) and MUST be verified against the embedded code-signing certificate when the build has one (always for a self-hosted server). Builds without an update server (`CLAUDE_REMOTE_UPDATES_URL` or `EAS_PROJECT_ID`) SHALL have updates disabled. The app MUST NOT reload by itself: a downloaded update applies on the next cold start or from Settings.

#### Scenario: JS update published
- **WHEN** a new update is published to the build's channel and the user opens the app
- **THEN** it is downloaded in the background and running after the next cold start

#### Scenario: Native change
- **WHEN** an update requires native code the installed binary does not have
- **THEN** the app does not receive it (different runtime version) and keeps running; the release notes say a new build is needed

#### Scenario: Build without an update server
- **WHEN** the app was built without `CLAUDE_REMOTE_UPDATES_URL` or `EAS_PROJECT_ID`
- **THEN** it never checks for updates and Settings says updates are off in this build

#### Scenario: Offline
- **WHEN** the update server cannot be reached
- **THEN** the app keeps working with the current bundle and shows no error

### Requirement: Manual check
Settings SHALL show the app version, runtime version, update id and date (or that the built-in bundle is running) and the daemon version, and offer "Check for updates", which checks, downloads and, after confirmation, restarts the app.

#### Scenario: Update available
- **WHEN** the user taps "Check for updates" and there is a new update
- **THEN** it is downloaded and the app offers to restart now

#### Scenario: Up to date
- **WHEN** there is no new update
- **THEN** Settings says the app is up to date

### Requirement: Daemon compatibility
The app SHALL compare `hello.daemonVersion` with the minimum daemon version it needs and, when the daemon is older, show a dismissible banner suggesting `claude-remote update` on the computer.

#### Scenario: Old daemon
- **WHEN** the app needs daemon 0.4.0 and connects to 0.3.0
- **THEN** a banner suggests running `claude-remote update` on the computer

### Requirement: Update channels
Builds SHALL follow the `production` channel (`expo-channel-name`). Settings → App SHALL let the user switch to `development` (after a confirmation) and back; the choice MUST persist and be applied before every check. Every update SHALL carry its channel in the signed `metadata.channel`, and the server's manifest filters MUST make the app leave an update of another channel once that channel has an update. A merge into `development` that touches the app SHALL publish to the `development` channel from CI with a token that cannot publish to other channels; production stays a manual publish.

#### Scenario: Following development
- **WHEN** the user picks `development` and a merge into `development` has been published
- **THEN** the app downloads that update and offers to restart into it

#### Scenario: Back to production
- **WHEN** a phone running a development update switches back to `production` and production has an update for its runtime
- **THEN** the production update is applied on the next start even if it is older

#### Scenario: Production not published yet
- **WHEN** it switches back to `production` and there is no production update for its runtime
- **THEN** Settings says the development version keeps running until one is published

#### Scenario: CI token
- **WHEN** the CI token is used to publish to `production`
- **THEN** the server refuses it (403)
