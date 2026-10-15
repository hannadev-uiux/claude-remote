## Why

The app needs a single list with the sessions of both profiles, knowing which ones are alive in tmux and which are only history (requirement D2).

## What Changes

- Session registry in the daemon that combines hooks (`SessionStart`, `SessionEnd`, `Stop`, `Notification`), existing tmux panes and recent transcripts on disk.
- States `running`, `waiting` (waiting for input or permission), `idle` and `ended`; `controllable` flag (has a live tmux pane).
- `UserPromptSubmit` hook added to the installed hooks.
- Persistence of the session ↔ pane link in `~/.claude-remote/state.json` to survive daemon restarts.
- Messages `sessions.list` → `sessions.snapshot` and events `session.updated`/`session.removed`.

## Capabilities

### New Capabilities
- `session-registry`: discovery, state and listing of the sessions of all profiles.

### Modified Capabilities
- `hooks-integration`: now also installs the `UserPromptSubmit` hook, used to mark the session as `running`.

## Impact

`infra/tmux` and `features/sessions` modules in the daemon.
