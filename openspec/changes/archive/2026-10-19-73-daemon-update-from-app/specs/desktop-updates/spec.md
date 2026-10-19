## ADDED Requirements

### Requirement: Update from the app
The daemon SHALL answer `daemon.update.check` with its update info (running version, channel, last check, the available update and whether it is a downgrade, what blocks updating, whether sessions are busy, and the last or current run), saving a given channel to the config first. It SHALL answer `daemon.update.start` by running the `remote-harness update` flow for the channel in a process that survives the service restart, and broadcast `daemon.update.info` whenever the run changes. It MUST refuse to start when it does not run from the installer's checkout, when it runs from sources, when it is not under a service manager, when a run is in progress or when no update is available, saying why.

#### Scenario: Update from the phone
- **WHEN** the app sends `daemon.update.start` for `main` and 0.13.0 is available
- **THEN** the app receives `fetching`, `building` and `restarting`, the daemon restarts, and after reconnecting the app sees 0.13.0 with the run `done`

#### Scenario: Development clone
- **WHEN** the daemon runs from a development clone
- **THEN** the info says `not-installer` and `daemon.update.start` is refused

#### Scenario: Switch channel
- **WHEN** the app checks with channel `development`
- **THEN** the config's `update.channel` becomes `development` and the info shows the development version

### Requirement: Update run record
`remote-harness update` SHALL record each step of the run (`fetching`, `building`, `restarting`, `done` or `failed`) with the versions, the commit, the error and whether it rolled back, wherever it was started. When building the new version fails, it SHALL check out and rebuild the previous commit before reporting the failure, so the service never restarts into a broken build. The daemon SHALL mark a run left at `restarting` as `done` when it starts.

#### Scenario: Build fails
- **WHEN** the new version fails to build
- **THEN** the checkout returns to the previous commit, it is rebuilt, the daemon keeps running and the run is `failed` with `rolledBack: true`
