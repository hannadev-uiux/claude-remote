## Why

Only sessions inside tmux can receive remote input, and the daemon only knows what happens in a session if Claude Code notifies it through hooks. Without launchers and hooks installed, no session is controllable.

## What Changes

- `claudin` and `drclaude` launchers that open `claude` in a named tmux window, with the profile's `CLAUDE_CONFIG_DIR`, forwarding all arguments.
- `claude-remote install` command that installs the launchers, adds their directory to `PATH` in `~/.zshrc` (marked block) and merges the HTTP hooks into each profile's `settings.json` without touching the rest of the file.
- `claude-remote uninstall` command that removes only what the installer added.
- `/hooks/:event` endpoint in the daemon that receives `SessionStart`, `SessionEnd`, `Stop`, `SubagentStop`, `Notification` and `PermissionRequest`.

## Capabilities

### New Capabilities
- `launchers`: commands that start controllable sessions inside tmux.
- `hooks-integration`: installing the hooks into the profiles and receiving the events in the daemon.

### Modified Capabilities

## Impact

The profiles' `settings.json` files, `~/.zshrc`, `~/.claude-remote/bin`. `features/hooks` module in the daemon.
