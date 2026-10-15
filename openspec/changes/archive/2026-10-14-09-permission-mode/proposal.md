## Why

The user wants to switch the permission mode (default, accept edits, plan, auto) from the phone, and see which one is actually active (D13).

## What Changes

- Reading the current mode from the hooks' `permission_mode`, from the transcript's `permission-mode` lines and from the status line (`capture-pane`).
- `session.setMode { sessionId, mode }`: sends Shift+Tab and re-reads the mode until it reaches the target, giving up after a full cycle.
- `bypassPermissions` is never accepted.
- `session.state` event with the confirmed mode.

## Capabilities

### New Capabilities
- `permission-mode`: reading and switching the sessions' permission mode.

### Modified Capabilities

## Impact

`features/mode` module in the daemon.
