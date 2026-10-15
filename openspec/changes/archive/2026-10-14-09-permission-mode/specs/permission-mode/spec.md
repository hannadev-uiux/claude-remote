## Purpose

Allows remotely reading and changing the permission mode of an active session, always showing the confirmed mode.

## ADDED Requirements

### Requirement: Mode reading
The daemon SHALL identify the current mode (`default`, `acceptEdits`, `plan`, `auto`, `bypassPermissions`, `dontAsk`) from the pane's status line and keep the session's `permissionMode` field up to date.

#### Scenario: Plan mode
- **WHEN** the status line shows "plan mode on"
- **THEN** the session has `permissionMode: "plan"`

### Requirement: Confirmed switch
`session.setMode` SHALL send Shift+Tab and re-read the mode after each keypress until it reaches the target; if the target does not appear after a full cycle (max. 6 keypresses), it MUST respond with `error` `mode_unreachable` with the mode where it stopped.

#### Scenario: Switch to accept edits
- **WHEN** the session is in `default` and the app requests `acceptEdits`
- **THEN** the daemon sends Shift+Tab, confirms "accept edits on" and responds with `ack` with `permissionMode: "acceptEdits"`

#### Scenario: Unavailable mode
- **WHEN** the app requests `auto` on a profile without auto mode in the cycle
- **THEN** it receives `error` `mode_unreachable` and the actual current mode

### Requirement: Bypass forbidden
The daemon MUST reject `bypassPermissions` with `error` `mode_forbidden`, and MUST NOT stop the cycle on it if it passes through it, moving on to the next mode.

#### Scenario: Bypass request
- **WHEN** the app requests `bypassPermissions`
- **THEN** it receives `mode_forbidden` and no key is sent

### Requirement: Busy session
The switch SHALL be rejected with `session_busy` if there is a pending permission request in the session.

#### Scenario: Dialog open
- **WHEN** there is a pending `permission.request`
- **THEN** `session.setMode` receives `session_busy`
