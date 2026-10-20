## MODIFIED Requirements

### Requirement: New session screen
The new-session screen SHALL be laid out as: an "Agent & profile" radio list, a Model row, the Directory field, the Recent list, the worktree toggle and the `Start session` primary button. Each profile row SHALL show the agent badge, the profile name in the profile color with the dashed `via <provider>` chip when the profile has a provider, `<agent> · <config dir>` (for example `Claude Code · ~/.claude`), and a selected mark on the chosen one. The Model row SHALL be shown only when the selected profile has a provider; it shows the chosen model, else the profile's default model, else "Provider default", and tapping it opens the model picker; the chosen model is sent as `model` in `session.start` and is reset when the profile changes. Each Recent row SHALL show the directory, its branch (`⎇`) and the number of sessions used there in the last 7 days when known, and the relative time of the last use. All texts MUST be translated.

The Recent list SHALL show at most three rows inline. A directory under `<repo>/.claude/worktrees/<name>` SHALL be folded into a row for `<repo>`, placed where the most recent of them would be, showing the number of worktrees folded into it ("3 worktrees") and the repository's own branch and weekly count when the repository itself is a recent directory. When the inline rows leave a recent directory out or fold a worktree into its repository, a "See all recent (N)" row SHALL follow, N being the number of recent directories; it opens a sheet listing every recent directory (worktrees as rows of their own) with a search box that filters by path and branch. Tapping a recent row, inline or in the sheet, SHALL fill the Directory field and close the keyboard (and the sheet).

The Directory field SHALL show the keyboard's Done key, which closes the keyboard. `Start session` and the starting indicator SHALL sit in a footer under the scrolling form, kept right above the on-screen keyboard while it is open, so they are visible without scrolling.

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

#### Scenario: Many recent directories
- **WHEN** the profile has 20 recent directories and the screen is open on a small iPhone
- **THEN** three Recent rows and "See all recent (20)" are shown, and `Start session` is visible without scrolling

#### Scenario: Worktrees folded into their repository
- **WHEN** the recent directories are `~/acme/.claude/worktrees/fix-login`, `~/acme/.claude/worktrees/rate-limit`, `~/acme` and `~/blog`
- **THEN** the inline rows are `~/acme` with "2 worktrees" and `~/blog`, and the sheet lists all four

#### Scenario: Search the full list
- **WHEN** the user opens "See all recent" and types `blog`
- **THEN** only the directories whose path or branch contains `blog` remain, and tapping one fills the Directory field and closes the sheet

#### Scenario: Done key
- **WHEN** the user types a path in the Directory field and presses Done
- **THEN** the keyboard closes and `Start session` is visible

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
