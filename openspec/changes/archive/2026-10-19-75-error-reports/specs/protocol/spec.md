## ADDED Requirements

### Requirement: Daemon diagnostics
The daemon SHALL log every rejected WS request with its message type and error code and without its payload or message, keep the last 50 rejections in memory as `{ at, type, code }`, and answer `diagnostics.errors` with `diagnostics.result { daemonVersion, errors }`, most recent first.

#### Scenario: Recent rejections
- **WHEN** a `session.start` was rejected with `invalid_cwd` and the app sends `diagnostics.errors`
- **THEN** the reply lists `{ type: "session.start", code: "invalid_cwd" }` with its time, and no path

#### Scenario: Older daemon
- **WHEN** the daemon does not know `diagnostics.errors`
- **THEN** it answers `unknown_type` and the app hides the option to include the computer's errors
