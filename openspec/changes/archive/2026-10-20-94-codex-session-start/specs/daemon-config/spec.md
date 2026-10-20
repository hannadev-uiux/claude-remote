## ADDED Requirements

### Requirement: Agent binary required for the app to offer a profile
The profile list the daemon sends in `auth.ok` SHALL exclude any profile whose agent's CLI (`claude`, `codex`, …) cannot be resolved on the daemon's PATH, logging a warning naming the profile and the agent. This check is narrower than the adapter/config-dir checks of "Configurable profiles" and "Nonexistent profile directory": it only affects what `auth.ok` offers to the app, not the full profile list `resolveProfiles` returns to `install`, `uninstall`, `remote-harness update` or the running `LifecycleService`, so installing or removing a profile's launcher still works before its CLI is on PATH.

#### Scenario: Codex profile without the binary
- **WHEN** a Codex profile is configured but `codex` is not on the daemon's PATH
- **THEN** `auth.ok` does not list that profile, and the daemon logs a warning naming the profile and `codex`

#### Scenario: Binary appears later
- **WHEN** `codex` is later installed and the daemon restarts
- **THEN** `auth.ok` lists the profile again

#### Scenario: Install is unaffected
- **WHEN** `remote-harness install` runs for a Codex profile whose CLI is not yet on PATH
- **THEN** the profile's launcher is still created, unaffected by this check
