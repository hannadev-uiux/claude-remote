## MODIFIED Requirements

### Requirement: New session
`session.start` SHALL open a tmux window in the `claude-remote` session running the profile's launcher in the given `cwd` and reply with an `ack` containing the created pane. A nonexistent directory MUST produce `error` `invalid_cwd`. When the pane is gone shortly after the launcher returns (Claude Code exited), the daemon MUST reply `error` `internal` with the reason instead of `ack`. Every `session.start` MUST be logged by the daemon: accepted starts with the profile and pane, rejected ones with the error code and reason.

#### Scenario: Start in a project
- **WHEN** the app requests a new session on `drclaude` in the `~/workspaces/api` directory
- **THEN** a window is created and the session appears in the list after `SessionStart`

#### Scenario: Claude Code exits right away
- **WHEN** the launcher creates the window but Claude Code exits before the settle check
- **THEN** the daemon replies `error` `internal` explaining that Claude Code exited and logs the rejection

#### Scenario: Rejected start is logged
- **WHEN** `session.start` is rejected with `invalid_cwd`
- **THEN** the daemon log has a warning with the code and reason

### Requirement: Shared checkout warning on start
The new-session screen SHALL inspect the chosen directory; for a git checkout it SHALL show the branch and offer "Isolated copy (git worktree)", and when the checkout has live sessions it SHALL list them and ask for confirmation before starting in the same checkout. When the daemon does not support inspection, or the inspection does not answer within a few seconds of tapping start, the screen MUST start without the warning and MUST NOT offer the worktree option. From the tap until the start succeeds, fails or is cancelled, the start button MUST show progress and ignore further taps. Failures MUST be shown under the button as translated messages.

#### Scenario: Confirm a shared start
- **WHEN** the user starts a session in a checkout with a live session and the worktree option off
- **THEN** the app asks for confirmation, offering to start in a worktree instead

#### Scenario: Inspection does not answer
- **WHEN** the user taps start and the directory inspection does not answer within 3 seconds
- **THEN** the app sends `session.start` without the shared checkout warning

#### Scenario: Immediate feedback
- **WHEN** the user taps start
- **THEN** the button shows a spinner right away and a second tap does nothing
