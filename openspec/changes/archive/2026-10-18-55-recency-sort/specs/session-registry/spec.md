## ADDED Requirements

### Requirement: Last activity
A session's `updatedAt` SHALL mean its last real activity: a hook event (prompt, stop, permission, notification, session start or end, subagent stop) or new transcript entries read by the daemon for the session or one of its subagents. Transcript activity SHALL advance `updatedAt` at most once every 5 seconds per session. Metadata refreshes (status line, checkout) MUST NOT advance it. A patch that only carries a newer `updatedAt` SHALL count as a change and be broadcast as `session.updated`.

#### Scenario: Streaming output
- **WHEN** a followed session appends transcript lines continuously for 12 seconds
- **THEN** its `updatedAt` advances at most three times and each advance is broadcast

#### Scenario: Status tick
- **WHEN** only the session's status line changes
- **THEN** `updatedAt` is unchanged

## MODIFIED Requirements

### Requirement: Link persistence
The session ↔ pane ↔ profile link SHALL be persisted with the session's `updatedAt` and restored when the daemon starts, discarding panes that no longer exist. A restored session SHALL keep its persisted `updatedAt`; when the state file predates the field, the transcript's modification time is used, and only without a transcript the restore time.

#### Scenario: Daemon restart
- **WHEN** the daemon restarts with a session still open in tmux
- **THEN** the session appears as controllable again

#### Scenario: Restart does not reorder
- **WHEN** two sessions with different `updatedAt` are restored after a restart
- **THEN** both keep their `updatedAt` and their relative order
