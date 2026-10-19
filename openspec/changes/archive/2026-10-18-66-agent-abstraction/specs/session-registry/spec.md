## ADDED Requirements

### Requirement: Session agent
Every session SHALL carry the `agent` of its profile (`claude` for profiles without one), set when the record is created from a hook or from the recent-transcript scan and sent to clients in `sessions.snapshot` and `session.updated`. Clients MUST treat a missing `agent` as Claude Code. The daemon SHALL build agent-specific launch arguments (resume, worktree) and find transcripts through the profile's agent adapter, so Claude Code sessions behave exactly as before this requirement.

#### Scenario: Session from a hook
- **WHEN** `SessionStart` arrives for the profile `claudin` (no `agent` in its config)
- **THEN** the session is listed with `agent: "claude"`

#### Scenario: Older daemon
- **WHEN** the app receives a session without `agent`
- **THEN** it shows the Claude Code badge and names Claude Code in the copy
