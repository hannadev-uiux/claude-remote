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
The list SHALL show every session that matches the current filter in one flat list, ordered by the chosen sort: **Recent** (default; newest `updatedAt` first, regardless of state) or **By state** (waiting first, then running, idle and ended, newest first inside each state). The sort SHALL be a ghost chip at the end of the filter row ("Recent ▾" / "By state ▾") that toggles on tap and is remembered on the device. Above the list the app SHALL show filter chips: `all` and one chip per profile (only when there is more than one profile), then `active` and `ended`; the selected chip is filled with the accent. A search box SHALL still filter by title and folder.

#### Scenario: Profile chip
- **WHEN** the user taps the "Work" chip
- **THEN** only the sessions of the Work profile remain, with no group header

#### Scenario: Single profile
- **WHEN** the daemon lists one profile
- **THEN** no profile chips are shown, only `active` and `ended`

#### Scenario: Recency by default
- **WHEN** an idle session was updated after a waiting one
- **THEN** the idle session is listed first and the waiting one keeps its warning border below it

#### Scenario: Back to the state order
- **WHEN** the user taps the sort chip
- **THEN** the list reorders waiting first and the chip reads "By state ▾", also after relaunching the app

### Requirement: Header and machine line
The list screen header SHALL show the product mark (22 pt, accent) followed by "Sessions". On regular width (the sidebar header on wide screens) it SHALL keep both the new-session and settings actions on the right. On compact width (the stack header on phones) it SHALL show only the settings action; the new-session action instead appears as a floating action button over the list (see "New session floating action button"). Under the header a machine line SHALL show a connection dot (success when connected, danger when the token was rejected, warning otherwise), the machine name, the number of sessions in the list, and — only the parts that are non-zero — the number running, the number waiting and the number of background tasks and running subagents across the list ("+N tasks"); on the right, when at least one agent is known, the number of distinct agents and, when any has a running session, how many. Tapping the running or the waiting count SHALL apply the `active` filter chip.

#### Scenario: Connected
- **WHEN** the app is connected to "MacBook Pro" and the list shows 7 sessions, 3 running, 1 waiting, all Claude Code
- **THEN** the machine line reads "● MacBook Pro · 7 sessions · 3 running · 1 waiting" with "1 agent · 1 running" on the right

#### Scenario: Nothing running or waiting
- **WHEN** every session in the list is idle or ended
- **THEN** the machine line shows the session count with no running or waiting part

#### Scenario: Tap the running count
- **WHEN** the user taps "3 running" in the machine line
- **THEN** the list applies the `active` filter chip, the same as tapping the "Active" chip

#### Scenario: Compact header has no new-session icon
- **WHEN** the session list shows in compact width (phone)
- **THEN** its header shows only the settings action, and a floating action button opens a new session instead

#### Scenario: Regular width keeps the header action
- **WHEN** the session list shows as the sidebar on regular width (iPad, wide Split View)
- **THEN** its header keeps both the new-session and settings actions, and no floating action button is shown

### Requirement: Row anatomy
Each row SHALL show: the agent badge (20 pt rounded square in the agent's fixed color with its two-letter code), the title and the relative time on the first line; the folder, the branch (`⎇`), a `worktree` hint when the folder is under `.claude/worktrees`, and the shared-checkout warning on the second line; the state pill (running = accent, waiting = warning, idle = success, ended = muted), the pending-permission badge, a plain `read-only` pill, the profile tag (name in the profile color), a muted glyph when the session or its profile is muted, a plain `+N subagents` pill and the background-tasks pill on the third line, with a chevron at the end. A waiting row SHALL keep the warning border and a selected row the accent border. The agent color MUST NOT change with the state.

#### Scenario: Waiting Claude Code session
- **WHEN** a Claude Code session of the Work profile waits for a permission in a worktree
- **THEN** its row shows the `cl` badge, the title, "4 min", the folder, the branch, "worktree", the warning border, the "waiting" pill and "Work" in the profile color

#### Scenario: Muted session with subagents
- **WHEN** a muted session has two subagents
- **THEN** the third line shows the muted glyph and "+2 subagents"

### Requirement: Relative time
Every session row and the recent-directories list SHALL show a compact relative time of the last activity: "now" under 45 seconds, then minutes ("2 min"), hours ("2 h"), "yesterday" for one day and days ("3 d"), translated.

#### Scenario: Yesterday
- **WHEN** a session's last activity was 26 hours ago
- **THEN** its row shows "yesterday" (pt-BR "ontem", es-ES "ayer")

### Requirement: Waiting strip
When at least one session is waiting for the user (a pending permission request of a session that has not ended, or a controllable session in the `waiting` state), the list screen SHALL pin a strip above the list with the header "WAITING FOR YOU · N" (N = sessions waiting) and the elapsed time since the oldest item, updated every second; the oldest item with its agent badge, session title, profile tag and `Tool · argument`; and the answer buttons (Deny, Always, Allow) for a tool permission, or a status line ("has a question", "plan ready for review", "waiting for you") with an Open button for questions, plans and sessions without a request. With more than one item it SHALL show "+N more", which opens the session of the next item. The strip MUST NOT change the order of the list, and the waiting row keeps its warning border. Read-only sessions without a request and requests of ended sessions MUST NOT appear in it.

#### Scenario: One Bash permission pending
- **WHEN** one session waits for `Bash · gh pr create --fill`
- **THEN** the strip shows "WAITING FOR YOU · 1", the elapsed time, the session's badge, title and profile, "Bash · gh pr create --fill" and Deny / Always / Allow

#### Scenario: Two sessions waiting
- **WHEN** a second session asks a question while the first permission is still pending
- **THEN** the header reads "WAITING FOR YOU · 2", the oldest request stays answerable and "+1 more" opens the second session

#### Scenario: Nothing waiting
- **WHEN** the last pending request is resolved
- **THEN** the strip disappears and the list keeps its order

#### Scenario: Read-only session marked waiting
- **WHEN** an older daemon reports a read-only session as `waiting` with no pending request
- **THEN** the strip does not show it

### Requirement: Swipe actions and action sheet
Each session row SHALL support swipe actions: swipe left reveals **Close** (danger) and **More**; swipe right reveals **Mute** / **Unmute** (accent) and **Pin** / **Unpin**. A full swipe SHALL trigger the first action of that side with a haptic; only one row MAY be open at a time, and tapping elsewhere or scrolling closes it. Long press on a row and **More** SHALL open the same action sheet: Close session (controllable) or Resume (read-only), Mute / Unmute, Pin to top / Unpin, Clean up worktree (when the session's folder is a worktree, with its path and change count), Copy folder path, Hide from list (read-only). Close SHALL open a confirmation sheet that explains the graceful sequence, warns more strongly when the session is running or waiting, and offers the worktree cleanup with its outcomes; "Discard" requires a second confirmation. The session screen's More options menu SHALL also offer Close session.

#### Scenario: Swipe to close
- **WHEN** the user swipes a running session fully to the left
- **THEN** the phone vibrates briefly and the close confirmation opens with the stronger warning

#### Scenario: Swipe to mute
- **WHEN** the user swipes a row to the right and taps Mute
- **THEN** the session is muted (the row shows the muted glyph) and the row closes

#### Scenario: Read-only session
- **WHEN** the user long-presses a read-only session
- **THEN** the sheet offers Resume and Hide from list instead of Close session

#### Scenario: Close with a dirty worktree
- **WHEN** the user closes a session whose worktree has 2 modified files and 3 unpushed commits and ticks "Also delete the worktree"
- **THEN** the sheet shows both counts and offers "Commit & push, then delete", "Discard changes and delete…" (with a second confirmation) and "Keep the worktree, just close"

### Requirement: Pinned and hidden sessions
Pinned sessions SHALL appear first in the list, in the chosen order among themselves; hidden sessions SHALL leave the list until they become live again (controllable and not ended), which also clears the hidden flag. Both are stored on the device.

#### Scenario: Pin
- **WHEN** the user pins an idle session while the list is sorted by recency
- **THEN** it moves to the top and stays there after relaunching the app

#### Scenario: Hidden session resumed on the computer
- **WHEN** a hidden ended session becomes controllable again
- **THEN** it reappears in the list

### Requirement: Draft marker
A session row SHALL show a `Draft:` line with the start of the session's draft (whitespace collapsed, cut at 60 characters with an ellipsis), or the number of photos when the draft has no text. The line MUST be translated and readable by screen readers, and MUST disappear when the draft is sent or discarded.

#### Scenario: Row with a draft
- **WHEN** a session has the draft "fix the failing test in parser.ts"
- **THEN** its row shows "Draft: fix the failing test in parser.ts"

#### Scenario: Draft sent
- **WHEN** the draft is sent
- **THEN** the row no longer shows the line

### Requirement: Worktree cleanup failure
When the worktree step of closing a session (or of cleaning up an ended session's worktree) fails, the close sheet SHALL stay open and show the daemon's message with two actions: **Retry** and **Keep the worktree**. Retry SHALL repeat only the worktree cleanup with the same action when the session already ended, and the whole close otherwise. Keep the worktree SHALL close the sheet without further requests. Texts MUST be translated.

#### Scenario: Close went through, removal failed
- **WHEN** the user closes a session with "Close and delete the worktree" and the session ends but the removal fails with "the worktree is locked by a running process (pid 4242)"
- **THEN** the sheet shows that message with Retry and Keep the worktree, and Retry sends `worktree.cleanup` with `delete`

#### Scenario: Keep
- **WHEN** the user taps Keep the worktree after a failure
- **THEN** the sheet closes and the worktree stays

### Requirement: New session floating action button
On compact width, a floating action button SHALL float over the bottom-right of the session list, inside the safe area, with an accessible label for "New session"; tapping it SHALL open the new-session screen and give the same selection haptic as the app's other primary actions. The list's bottom padding SHALL be large enough that the button never covers its last row. The Cmd+N keyboard shortcut SHALL keep opening the new-session screen independently of the button.

#### Scenario: Tapping the floating action button
- **WHEN** the user taps the floating action button on the compact session list
- **THEN** the new-session screen opens, the same as tapping the old header icon did

#### Scenario: Last row stays reachable
- **WHEN** the session list is scrolled to its end
- **THEN** the last row is fully visible above the floating action button, not covered by it

### Requirement: Collapsing header on scroll
On compact width, scrolling the session list down SHALL collapse the machine line and the filter chip row into a compact bar — a small mark glyph, the search field and a filters button that shows a dot when a filter is active (`isFiltering`) — animated on the UI thread (`react-native-reanimated`) with no layout jump. Scrolling up by any amount, or the list being at its top, SHALL restore the full header. The animation SHALL be skipped (an immediate switch, no tween) when the OS "Reduce Motion" setting is on. The filters button SHALL open a sheet with the same filter chips as the full header's row (profile chips when there is more than one profile, Active, Ended, the sort chip), so every filter stays reachable from the compact bar. On regular width (the sidebar) the header SHALL NOT collapse; it always shows in full.

#### Scenario: Scroll down
- **WHEN** the user scrolls the session list down on a phone
- **THEN** the machine line and filter chips give way to a compact bar with the mark, the search field and the filters button

#### Scenario: Scroll up restores the header
- **WHEN** the user scrolls up, even slightly, while the compact bar shows
- **THEN** the full header (machine line and filter chips) reappears

#### Scenario: Reduce Motion
- **WHEN** the device has Reduce Motion on
- **THEN** the header switches between full and compact with no animated transition

#### Scenario: Filters from the compact bar
- **WHEN** the user taps the filters button while a profile filter is active
- **THEN** the button shows a dot and the sheet opens with that profile's chip selected, matching the full header

#### Scenario: Regular width never collapses
- **WHEN** the session list shows as the sidebar on regular width
- **THEN** the header stays fully expanded regardless of scroll position
