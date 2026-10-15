# session-lifecycle Specification

## Purpose
Allows starting new sessions and resuming ended sessions from the app, always inside tmux.

## Requirements

### Requirement: New session
`session.start` SHALL open a tmux window in the `claude-remote` session running the profile's launcher in the given `cwd` and reply with an `ack` containing the created pane. A nonexistent directory MUST produce `error` `invalid_cwd`.

#### Scenario: Start in a project
- **WHEN** the app requests a new session on `drclaude` in the `~/workspaces/api` directory
- **THEN** a window is created and the session appears in the list after `SessionStart`

### Requirement: Resume session
`session.resume` SHALL open a window with `claude --resume <sessionId>` in the session's original `cwd` with the correct profile.

#### Scenario: Resume an ended session
- **WHEN** the app taps "Resume" on an ended session
- **THEN** the session becomes controllable again with the same history

### Requirement: Recent directories
`projects.list { profileId }` SHALL return the `cwd` values of the profile's sessions ordered by most recent use, up to 30.

#### Scenario: Choose a directory
- **WHEN** the user opens "New session"
- **THEN** they see the recent directories of the chosen profile
