## Why

The user needs to see at a glance what is running in both profiles and get into the right session (A2).

## What Changes

- Home screen with sessions grouped by profile (header in the profile's color), state (running, waiting, idle, ended), title, directory and relative time.
- Sessions waiting for permission highlighted at the top of each group.
- Profile filter and pull to refresh.
- Real-time updates via `session.updated`.

## Capabilities

### New Capabilities
- `app-session-list`: listing sessions in the app.

### Modified Capabilities

## Impact

`src/features/sessions` in the app.
