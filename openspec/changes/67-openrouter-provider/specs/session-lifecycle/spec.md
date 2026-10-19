## MODIFIED Requirements

### Requirement: New session
`session.start` SHALL open a tmux window in the `claude-remote` session running the profile's launcher in the given `cwd` and reply with an `ack` containing the created pane. With a `model`, the daemon SHALL pass `--model <id>` to the launcher. A nonexistent directory MUST produce `error` `invalid_cwd`. When the pane is gone shortly after the launcher returns (Claude Code exited), the daemon MUST reply `error` `internal` with the reason instead of `ack`. Every `session.start` MUST be logged by the daemon: accepted starts with the profile and pane, rejected ones with the error code and reason.

#### Scenario: Start in a project
- **WHEN** the app requests a new session on `drclaude` in the `~/workspaces/api` directory
- **THEN** a window is created and the session appears in the list after `SessionStart`

#### Scenario: Start with a model
- **WHEN** the app requests a new session with `model` `anthropic/claude-opus-5.5`
- **THEN** the launcher receives `--model anthropic/claude-opus-5.5`

#### Scenario: Claude Code exits right away
- **WHEN** the launcher creates the window but Claude Code exits before the settle check
- **THEN** the daemon replies `error` `internal` explaining that Claude Code exited and logs the rejection

#### Scenario: Rejected start is logged
- **WHEN** `session.start` is rejected with `invalid_cwd`
- **THEN** the daemon log has a warning with the code and reason

### Requirement: New session screen
The new-session screen SHALL be laid out as: an "Agent & profile" radio list, a Model row, the Directory field, the Recent list, the worktree toggle and the `Start session` primary button. Each profile row SHALL show the agent badge, the profile name in the profile color with the dashed `via <provider>` chip when the profile has a provider, `<agent> · <config dir>` (for example `Claude Code · ~/.claude`), and a selected mark on the chosen one. The Model row SHALL be shown only when the selected profile has a provider; it shows the chosen model, else the profile's default model, else "Provider default", and tapping it opens the model picker; the chosen model is sent as `model` in `session.start` and is reset when the profile changes. Each Recent row SHALL show the directory, its branch (`⎇`) and the number of sessions used there in the last 7 days when known, and the relative time of the last use. All texts MUST be translated.

#### Scenario: One Claude Code profile
- **WHEN** the computer has the profile "Personal" with config dir `~/.claude`
- **THEN** the list shows its row with the Claude Code badge, "Personal" and `Claude Code · ~/.claude`, selected, and no Model row

#### Scenario: OpenRouter profile selected
- **WHEN** the user selects the profile "Work" whose provider is OpenRouter with default model `anthropic/claude-sonnet-5.5`
- **THEN** its row shows the `via OpenRouter` chip, the Model row reads `anthropic/claude-sonnet-5.5`, and picking `anthropic/claude-opus-5.5` makes `Start session` send that model

#### Scenario: Recent directory details
- **WHEN** `~/projects/acme-api` was used by two sessions this week on branch `main`
- **THEN** its Recent row reads `⎇ main · 2 sessions this week`
