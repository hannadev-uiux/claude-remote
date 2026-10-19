## ADDED Requirements

### Requirement: Keep awake
The service daemon SHALL prevent idle system sleep according to the `keepAwake` setting: `off` never, `sessions` (default) while any session is running or waiting and for 10 minutes after the last such activity, `always` while the daemon runs. It MUST use an OS helper that ends with the daemon (macOS `caffeinate -i -w`, Linux `systemd-inhibit --what=idle:sleep`, WSL `SetThreadExecutionState` through PowerShell), MUST NOT change power settings, and MUST release the assertion on stop. `remote-harness keep-awake [mode]` SHALL show or set the mode and apply it to the running daemon. `doctor` SHALL show the mode and whether the assertion is held, fail when the helper is unavailable, and on a Mac laptop note that closing the lid can still sleep. Development runs (`--dev`) MUST NOT hold it.

#### Scenario: Long turn while away
- **WHEN** a session is running and nobody touches the computer
- **THEN** the computer does not idle-sleep, while the display may turn off and the screen may lock

#### Scenario: Grace after the turn
- **WHEN** the last running session finishes
- **THEN** the assertion is kept for 10 minutes and released if no session becomes active meanwhile

#### Scenario: Mode off
- **WHEN** the user runs `remote-harness keep-awake off` while the assertion is held
- **THEN** the running daemon releases it and the computer may sleep normally

#### Scenario: Daemon crash
- **WHEN** the daemon process dies without cleanup
- **THEN** the helper ends with it and the computer is not left pinned awake

#### Scenario: Helper missing
- **WHEN** `systemd-inhibit` is unavailable or refused
- **THEN** the daemon keeps working, logs it once and `doctor` reports the keep-awake check as failed
