## ADDED Requirements

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
