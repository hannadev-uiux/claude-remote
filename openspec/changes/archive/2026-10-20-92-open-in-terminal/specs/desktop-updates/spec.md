## MODIFIED Requirements

### Requirement: Tray icon
When a supported helper is available (macOS menu bar; Linux AppIndicator), the service daemon SHALL show a tray icon whose glyph encodes only the state: the mark as a template image when idle, the ring filled while any session works, an amber dot (the only color) while a permission waits, and 40 % opacity when the daemon is gone. The menu SHALL show, top to bottom: the status (`machine · version · since HH:MM`); **Waiting for you** with the oldest pending tool permission (`session title · Tool · detail`) and Allow, Always allow (when the daemon suggested a rule, saved like the app does), Deny and Open in terminal (tmux); **Sessions** by recency, each as `title · state` with its folder, profile and worktree, Open in terminal (tmux) and Close session (the graceful close), the ended ones collapsed in one submenu; **Phones** with the number of registered phones and whether push is on; New session…, Pair a phone…, Open the docs and Preferences…; then "Check for updates", "Update now" (when an update is available), the automatic updates toggle, the channel choice, "Open logs", "Restart daemon" (under a service manager), "Run doctor" and "Quit tray". The menu SHALL refresh on session and permission changes. Without a helper the daemon MUST keep working headless. `tray: false` in the config SHALL disable it. All labels MUST be translated. The SwiftUI popover, the pairing QR, the Preferences window and the Windows tray are not part of this requirement.

#### Scenario: Update from the menu bar
- **WHEN** an update is available and the user chooses "Update now"
- **THEN** the update runs and the daemon restarts on the new version

#### Scenario: No graphical session
- **WHEN** the daemon runs on a Linux server without a display
- **THEN** no tray is started and the daemon works as before

#### Scenario: Allow from the menu bar
- **WHEN** a `Bash` permission waits and the user picks Allow under "Waiting for you"
- **THEN** the daemon answers the request as if the app had, the glyph loses its dot and the section disappears

#### Scenario: Focus a session
- **WHEN** the user picks "Open in terminal (tmux)" on a session and a terminal client is already attached to a different tmux session
- **THEN** the daemon switches that client to the picked session's window and pane and brings the terminal application owning that client to the front

#### Scenario: Open a session with no terminal attached
- **WHEN** the user picks "Open in terminal (tmux)" on a session and no terminal client is attached to any tmux session
- **THEN** the daemon opens a new terminal window that attaches to that session's window and pane

#### Scenario: No supported terminal found
- **WHEN** the user picks "Open in terminal (tmux)" and no terminal application the daemon knows how to drive is installed or running
- **THEN** the action fails instead of doing nothing silently, and the daemon logs the failure like it does for any other failed tray action

#### Scenario: Working glyph
- **WHEN** a session is running and nothing waits
- **THEN** the menu bar shows the mark with its ring filled, as a template image
