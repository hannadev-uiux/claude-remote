## Why

The daemon must always be up without manual intervention, and the user wants to mute notifications from a noisy profile or session (D11, A10).

## What Changes

- `claude-remote service install|uninstall|status` generates and loads a LaunchAgent (`~/Library/LaunchAgents/tech.doctorx.claude-remote.plist`) with `KeepAlive` and logs in `~/.claude-remote/logs`.
- Recovery after a tmux restart: the daemon reconciles the registry when it detects that the tmux server is back.
- `settings.mute { target: profile|session, id, muted }` and a mute list persisted in the daemon; the app shows the controls in settings and in the session.

## Capabilities

### New Capabilities
- `daemon-service`: running the daemon as a macOS service.
- `notification-mute`: muting notifications per profile or session.

### Modified Capabilities

## Impact

Daemon CLI, `features/push`, settings and session screens in the app.
