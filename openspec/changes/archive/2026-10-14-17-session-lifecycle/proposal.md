## Why

Starting a task or resuming an old session from the phone avoids having to go to the Mac (D8, D9, A9).

## What Changes

- Daemon: `session.start { profileId, cwd }` opens a new tmux window with the profile's launcher in the chosen directory.
- Daemon: `session.resume { profileId, sessionId }` opens a window with `claude --resume <id>` in the original `cwd`.
- Daemon: list of recent directories per profile (from the profile's projects).
- App: "New session" button (profile + recent or typed directory) and "Resume" on ended sessions.

## Capabilities

### New Capabilities
- `session-lifecycle`: start and resume sessions remotely.

### Modified Capabilities

## Impact

`features/lifecycle` in the daemon; `src/features/sessions` in the app.
