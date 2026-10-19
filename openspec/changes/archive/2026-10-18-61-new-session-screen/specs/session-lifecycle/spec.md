## ADDED Requirements

### Requirement: New session screen
The new-session screen SHALL be laid out as: an "Agent & profile" radio list, a Model row, the Directory field, the Recent list, the worktree toggle and the `Start session` primary button. Each profile row SHALL show the agent badge, the profile name in the profile color, `<agent> · <config dir>` (for example `Claude Code · ~/.claude`) and the provider when it is not the default, with a selected mark on the chosen one. The Model row SHALL be shown only when the selected profile's provider lists models (none until the protocol carries providers). Each Recent row SHALL show the directory, its branch (`⎇`) and the number of sessions used there in the last 7 days when known, and the relative time of the last use. All texts MUST be translated.

#### Scenario: One Claude Code profile
- **WHEN** the computer has the profile "Personal" with config dir `~/.claude`
- **THEN** the list shows its row with the Claude Code badge, "Personal" and `Claude Code · ~/.claude`, selected, and no Model row

#### Scenario: Recent directory details
- **WHEN** `~/projects/acme-api` was used by two sessions this week on branch `main`
- **THEN** its Recent row reads `⎇ main · 2 sessions this week`

## MODIFIED Requirements

### Requirement: Recent directories
`projects.list { profileId }` SHALL return the `cwd` values of the profile's sessions ordered by most recent use, up to 30, each with `lastUsedAt`, the `branch` of the most recent session in that directory (`null` when unknown or outside git) and `sessions`, the number of the profile's sessions in that directory updated in the last 7 days.

#### Scenario: Choose a directory
- **WHEN** the user opens "New session"
- **THEN** they see the recent directories of the chosen profile, with branch and weekly usage when known

#### Scenario: Weekly count
- **WHEN** a directory had three sessions, one of them a month ago
- **THEN** its item reports `sessions: 2`

### Requirement: Shared checkout warning on start
The new-session screen SHALL inspect the chosen directory; for a git checkout it SHALL show the branch and offer "Isolated copy (git worktree)" with an agent-neutral hint ("The agent works on its own branch in .claude/worktrees…"), and when the checkout has live sessions it SHALL list them, add that the worktree keeps them apart, and ask for confirmation before starting in the same checkout. When the daemon does not support inspection, or the inspection does not answer within a few seconds of tapping start, the screen MUST start without the warning and MUST NOT offer the worktree option. From the tap until the start succeeds, fails or is cancelled, the start button MUST show progress and ignore further taps. Failures MUST be shown under the button as translated messages.

#### Scenario: Confirm a shared start
- **WHEN** the user starts a session in a checkout with a live session and the worktree option off
- **THEN** the app asks for confirmation, offering to start in a worktree instead

#### Scenario: Inspection does not answer
- **WHEN** the user taps start and the directory inspection does not answer within 3 seconds
- **THEN** the app sends `session.start` without the shared checkout warning

#### Scenario: Immediate feedback
- **WHEN** the user taps start
- **THEN** the button shows a spinner right away and a second tap does nothing
