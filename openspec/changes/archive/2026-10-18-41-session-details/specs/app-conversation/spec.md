## ADDED Requirements

### Requirement: Session details
Tapping the session title in the header, or the folder in the row below it, SHALL open a "Session details" sheet. The title MUST be exposed as a button with a localized accessibility label. The sheet SHALL list the full folder path, the git branch and worktree root when the folder is in git, the profile name, alias and config dir, the state, the permission mode, whether the session is controllable or read-only, the tmux pane when there is one, the session id and the last update. Values MUST wrap instead of being cut and MUST be selectable. The folder, the worktree root and the session id SHALL have a Copy action that puts the full value on the clipboard. The sheet MUST close with its Close button, by tapping outside and with the Android back button. All texts MUST be translated.

#### Scenario: Long folder
- **WHEN** the user taps the title of a session whose folder is longer than the screen width
- **THEN** the sheet shows the full path wrapped over several lines

#### Scenario: Copy the folder
- **WHEN** the user taps Copy on the folder row
- **THEN** the full path is on the clipboard and the row briefly shows "Copied"

#### Scenario: Read-only session
- **WHEN** the session has no tmux pane
- **THEN** the sheet shows the access as read-only and has no pane row

#### Scenario: Android back
- **WHEN** the sheet is open on Android and the user presses back
- **THEN** the sheet closes and the session screen stays open
