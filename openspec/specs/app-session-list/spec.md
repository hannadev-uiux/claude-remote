# app-session-list Specification

## Purpose
Shows in the app all sessions of the configured profiles, with real-time state, and leads to the session screen.

## Requirements

### Requirement: Real-time updates
The list SHALL reflect `session.updated` and `session.removed` without reloading the screen.

#### Scenario: Session finishes
- **WHEN** a session goes from `running` to `idle`
- **THEN** the badge changes in the list without user action

### Requirement: Read-only
Sessions with `controllable: false` SHALL show a "read-only" badge.

#### Scenario: Session outside tmux
- **WHEN** the session has no pane
- **THEN** it appears with a "read-only" badge

### Requirement: Empty state
With no sessions, the screen SHALL show instructions to start one with `claudin` or `drclaude`.

#### Scenario: No sessions
- **WHEN** the snapshot is empty
- **THEN** the screen shows the launcher usage instructions

### Requirement: Shared checkout in the list
Each session row SHALL show the branch of its checkout next to the directory, and a live session that shares its checkout with other live sessions SHALL show "shared checkout (N)" in the warning color on the same line.

#### Scenario: Two sessions in the same checkout
- **WHEN** two live sessions have the same `checkout.root`
- **THEN** both rows show "shared checkout (1)"

#### Scenario: Ended session
- **WHEN** one of them ends
- **THEN** the warning disappears from the other

### Requirement: Flat list with filter chips
The list SHALL show every session that matches the current filter in one flat list, ordered waiting first, then running, idle and ended, and by descending `updatedAt` within each state (until the recency sort replaces it). Above the list the app SHALL show filter chips: `all` and one chip per profile (only when there is more than one profile), then `active` and `ended`; the selected chip is filled with the accent. A search box SHALL still filter by title and folder.

#### Scenario: Profile chip
- **WHEN** the user taps the "Work" chip
- **THEN** only the sessions of the Work profile remain, with no group header

#### Scenario: Single profile
- **WHEN** the daemon lists one profile
- **THEN** no profile chips are shown, only `active` and `ended`

### Requirement: Header and machine line
The list screen header SHALL show the product mark (22 pt, accent) followed by "Sessions", with the new-session and settings actions on the right, both in the compact stack header and in the sidebar header on wide screens. Under it a machine line SHALL show a connection dot (success when connected, danger when the token was rejected, warning otherwise), the machine name, the number of sessions in the list and, when at least one is known, the number of distinct agents.

#### Scenario: Connected
- **WHEN** the app is connected to "MacBook Pro" and the list shows 7 sessions, all Claude Code
- **THEN** the machine line reads "● MacBook Pro · 7 sessions" with "1 agent" on the right

### Requirement: Row anatomy
Each row SHALL show: the agent badge (20 pt rounded square in the agent's fixed color with its two-letter code), the title and the relative time on the first line; the folder, the branch (`⎇`), a `worktree` hint when the folder is under `.claude/worktrees`, and the shared-checkout warning on the second line; the state pill (running = accent, waiting = warning, idle = success, ended = muted), the pending-permission badge, a plain `read-only` pill, the profile tag (name in the profile color), a muted glyph when the session or its profile is muted, a plain `+N subagents` pill and the background-tasks pill on the third line, with a chevron at the end. A waiting row SHALL keep the warning border and a selected row the accent border. The agent color MUST NOT change with the state.

#### Scenario: Waiting Claude Code session
- **WHEN** a Claude Code session of the Work profile waits for a permission in a worktree
- **THEN** its row shows the `cl` badge, the title, "4 min", the folder, the branch, "worktree", the warning border, the "waiting" pill and "Work" in the profile color

#### Scenario: Muted session with subagents
- **WHEN** a muted session has two subagents
- **THEN** the third line shows the muted glyph and "+2 subagents"
