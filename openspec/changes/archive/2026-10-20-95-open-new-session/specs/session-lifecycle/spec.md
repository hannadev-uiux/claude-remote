## MODIFIED Requirements

### Requirement: New session
`session.start` SHALL open a tmux window in the `claude-remote` session running the profile's launcher in the given `cwd` and reply with `session.started` carrying the created pane's `paneId` and, when it resolves in time, the new session's `sessionId`. With a `model`, the daemon SHALL pass `--model <id>` to the launcher. A nonexistent directory MUST produce `error` `invalid_cwd`. When the pane is gone shortly after the launcher returns (the agent CLI exited), the daemon MUST reply `error` `internal` naming the profile's actual agent (e.g. "Codex", "Claude Code") instead of `session.started`. After confirming the pane is alive, the daemon SHALL wait, up to a bounded timeout, for that pane's `SessionStart` hook to register a session; `sessionId` is that session's id, or `null` when the hook has not fired by the end of the wait — `session.started` is still sent, not delayed further. Every `session.start` MUST be logged by the daemon: accepted starts with the profile and pane, rejected ones with the error code and reason.

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

#### Scenario: Session registers before the wait ends
- **WHEN** the new pane's `SessionStart` hook registers the session while `session.start` is still waiting
- **THEN** `session.started` carries that `sessionId` instead of waiting out the rest of the timeout

#### Scenario: Session has not registered yet
- **WHEN** the wait window elapses with no `SessionStart` hook for the launched pane
- **THEN** `session.started` carries `sessionId: null` and the pane keeps starting; a later `SessionStart` for it still updates the session list normally

### Requirement: New session screen
The new-session screen SHALL be laid out as: an "Agent & profile" radio list, a Model row, the Directory field, the Recent list, the worktree toggle and the `Start session` primary button. Each profile row SHALL show the agent badge, the profile name in the profile color with the dashed `via <provider>` chip when the profile has a provider, `<agent> · <config dir>` (for example `Claude Code · ~/.claude`), and a selected mark on the chosen one. The Model row SHALL be shown only when the selected profile has a provider; it shows the chosen model, else the profile's default model, else "Provider default", and tapping it opens the model picker; the chosen model is sent as `model` in `session.start` and is reset when the profile changes. Each Recent row SHALL show the directory, its branch (`⎇`) and the number of sessions used there in the last 7 days when known, and the relative time of the last use. All texts MUST be translated.

When the "Open the session after creating it" setting is on (its default) and `session.start` succeeds, the screen SHALL navigate straight into the new session (replacing the new-session screen with `/session/<id>`) and request focus on its message composer. When the reply's `sessionId` is `null`, the screen SHALL instead show a starting indicator naming the profile's agent and the directory (e.g. "Starting Claude Code in ~/project…") and keep watching the session list for a session whose `paneId` matches the one just launched, navigating in as soon as one appears. When the setting is off, `Start session` SHALL keep returning to the session list on success, as before. A failed start SHALL always leave the user on the form with the error, regardless of the setting.

#### Scenario: One Claude Code profile
- **WHEN** the computer has the profile "Personal" with config dir `~/.claude`
- **THEN** the list shows its row with the Claude Code badge, "Personal" and `Claude Code · ~/.claude`, selected, and no Model row

#### Scenario: OpenRouter profile selected
- **WHEN** the user selects the profile "Work" whose provider is OpenRouter with default model `anthropic/claude-sonnet-5.5`
- **THEN** its row shows the `via OpenRouter` chip, the Model row reads `anthropic/claude-sonnet-5.5`, and picking `anthropic/claude-opus-5.5` makes `Start session` send that model

#### Scenario: Recent directory details
- **WHEN** `~/projects/acme-api` was used by two sessions this week on branch `main`
- **THEN** its Recent row reads `⎇ main · 2 sessions this week`

#### Scenario: Session already registered
- **WHEN** `Start session` is tapped, the setting is on, and `session.started` comes back with a `sessionId`
- **THEN** the screen is replaced by that session's conversation, composer focused

#### Scenario: Session still starting
- **WHEN** `session.started` comes back with `sessionId: null`
- **THEN** the screen shows the starting indicator, then navigates in once a session with the launched `paneId` appears in the list, composer focused

#### Scenario: Setting off
- **WHEN** the "Open the session after creating it" setting is off and `session.start` succeeds
- **THEN** the screen returns to the session list, as it did before this change

#### Scenario: Start fails
- **WHEN** `session.start` is rejected
- **THEN** the screen stays on the form showing the error, regardless of the setting
