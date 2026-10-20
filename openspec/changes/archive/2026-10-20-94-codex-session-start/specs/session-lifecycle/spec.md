## MODIFIED Requirements

### Requirement: New session
`session.start` SHALL open a tmux window in the `claude-remote` session running the profile's launcher in the given `cwd` and reply with an `ack` containing the created pane. With a `model`, the daemon SHALL pass `--model <id>` to the launcher. A nonexistent directory MUST produce `error` `invalid_cwd`. When the pane is gone shortly after the launcher returns (the agent CLI exited), the daemon MUST reply `error` `internal` naming the profile's actual agent (e.g. "Codex", "Claude Code") instead of `ack`. Every `session.start` MUST be logged by the daemon: accepted starts with the profile and pane, rejected ones with the error code and reason.

#### Scenario: Start in a project
- **WHEN** the app requests a new session on `drclaude` in the `~/workspaces/api` directory
- **THEN** a window is created and the session appears in the list after `SessionStart`

#### Scenario: Start with a model
- **WHEN** the app requests a new session with `model` `anthropic/claude-opus-5.5`
- **THEN** the launcher receives `--model anthropic/claude-opus-5.5`

#### Scenario: Claude Code exits right away
- **WHEN** the launcher creates the window but Claude Code exits before the settle check
- **THEN** the daemon replies `error` `internal` explaining that Claude Code exited and logs the rejection

#### Scenario: Codex exits right away
- **WHEN** the launcher creates the window for a Codex profile but `codex` exits before the settle check
- **THEN** the daemon replies `error` `internal` explaining that Codex exited (not "Claude Code") and logs the rejection

#### Scenario: Rejected start is logged
- **WHEN** `session.start` is rejected with `invalid_cwd`
- **THEN** the daemon log has a warning with the code and reason
