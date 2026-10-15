## Purpose

Maintains the unified list of Claude Code sessions across all profiles, with their state and whether they can be controlled.

## ADDED Requirements

### Requirement: Unified listing
The daemon SHALL answer `sessions.list` with all active sessions (linked to a live tmux pane) and recent ones (transcripts modified in the last 7 days) from all profiles, each with `id`, `profileId`, `cwd`, `title`, `state`, `permissionMode`, `controllable`, `updatedAt`.

#### Scenario: Two profiles
- **WHEN** there is an active session in `claudin` and another in `drclaude`
- **THEN** the snapshot contains both, each with its own `profileId`

#### Scenario: Disk-only session
- **WHEN** a recent transcript has no linked tmux pane
- **THEN** the session appears with `controllable: false` and state `ended`

### Requirement: Event-driven state
The daemon SHALL update the session state from the hooks: `SessionStart` → `idle`; `UserPromptSubmit` → `running`; `Stop` → `idle`; `Notification`/`PermissionRequest` → `waiting`; `SessionEnd` → `ended`. Each change MUST be sent to clients as `session.updated`.

#### Scenario: Permission request
- **WHEN** a `Notification` of type `permission_prompt` arrives
- **THEN** the session becomes `waiting` and clients receive `session.updated`

### Requirement: Dead pane
The daemon SHALL periodically check (every 5 s) whether the linked panes exist and MUST mark sessions whose pane is gone as `ended` and `controllable: false`.

#### Scenario: tmux window closed
- **WHEN** the user closes the session's window on the Mac
- **THEN** within 5 s the session appears as ended in the app

### Requirement: Link persistence
The session ↔ pane ↔ profile link SHALL be persisted and restored when the daemon starts, discarding panes that no longer exist.

#### Scenario: Daemon restart
- **WHEN** the daemon restarts with a session still open in tmux
- **THEN** the session appears as controllable again
