## ADDED Requirements

### Requirement: Permission hook timeout
The `PermissionRequest` hook SHALL be installed with a timeout longer than both daemon waits: `max(hookPermissionTimeoutSec, questionTimeoutSec + 20)` seconds, so the daemon always answers before Claude Code closes the hook. `install` and `update` SHALL rewrite existing hooks with the new timeout.

#### Scenario: Default config
- **WHEN** the hooks are installed with the default config
- **THEN** the Claude Code `PermissionRequest` hook has `timeout: 3320`
