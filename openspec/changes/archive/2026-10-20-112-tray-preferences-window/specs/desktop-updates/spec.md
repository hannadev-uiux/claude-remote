## MODIFIED Requirements

### Requirement: Tray icon
When a supported helper is available (macOS menu bar; Linux AppIndicator), the service daemon SHALL show a tray icon whose glyph encodes only the state: the mark as a template image when idle, the ring filled while any session works, an amber dot (the only color) while a permission waits, and 40 % opacity when the daemon is gone. The menu SHALL show, top to bottom: the status (`machine · version · since HH:MM`); **Waiting for you** with the oldest pending tool permission (`session title · Tool · detail`) and Allow, Always allow (when the daemon suggested a rule, saved like the app does), Deny and Open in terminal (tmux); **Sessions** by recency, each as `title · state` with its folder, profile and worktree, Open in terminal (tmux), Rename… and Close session (the graceful close), the ended ones collapsed in one submenu; **Phones** with the number of registered phones and whether push is on; New session…, Pair a phone…, Open the docs and Preferences…; then "Check for updates", "Update now" (when an update is available), the automatic updates toggle, the channel choice, "Open logs", "Restart daemon" (under a service manager), "Run doctor" and "Quit tray". The menu SHALL refresh on session and permission changes. A helper that reports it can open windows (macOS) SHALL list at most 5 live sessions before a trailing "See all sessions…" item; a helper without window support (Linux; Windows later) keeps listing up to 8. Without a helper the daemon MUST keep working headless. `tray: false` in the config SHALL disable it. All labels MUST be translated. The SwiftUI popover and the Windows tray are not part of this requirement; Pair a phone, Preferences, the Sessions window and rename have their own requirements below.

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

#### Scenario: More than 5 sessions on macOS
- **WHEN** 8 sessions are live and the helper supports windows
- **THEN** the menu lists the 5 most relevant (waiting first, then most recent) and a trailing "See all sessions…" opens the Sessions window with all 8

#### Scenario: More than 5 sessions on Linux
- **WHEN** 8 sessions are live and the helper does not support windows
- **THEN** the menu keeps listing up to 8, as before, with no "See all sessions…" item

### Requirement: Tray preferences
On a helper that reports it can open windows (macOS), the tray's "Preferences…" SHALL open a native **Preferences window** instead of the config file, with tabs:
- **General**: machine name (free text, shown elsewhere as the machine's display name), "Show in menu bar" (the `tray` config), "Show permission requests here" (`trayPermissions`), "Start at login" (installs or removes the login service).
- **Updates**: the update channel, the automatic updates toggle and "Check for updates now", reflecting the same state and actions as the existing menu items.
- **Notifications**: "Push notifications & live status" (the `push` setting; its hint SHALL say it covers both), and a line pointing to the app for per-session mute rules.
- **Profiles**: the configured profiles, read-only (name, agent, color).
- **Pairing**: the pairing QR code and address, "Show the pairing in the terminal" and "Rotate token…", the same actions as the menu's Pair a phone submenu.
- **Advanced**: "Open the config file…", "Open the logs folder" and "Run doctor".

Every change SHALL be written to the config file (read → merge → backup → atomic write) and applied without restarting the daemon, like the rest of the tray's settings. A helper without window support (Linux; Windows later) keeps "Preferences…" opening the config file directly.

#### Scenario: Turn push off from the menu bar
- **WHEN** the user turns off "Push notifications & live status" in the Preferences window
- **THEN** the config has `push: "off"` and the daemon sends no more pushes or live status until it is turned on again

#### Scenario: Permissions only in the app
- **WHEN** "Show permission requests here" is off and a permission waits
- **THEN** the menu shows the waiting request with Open in terminal and no Allow / Deny

#### Scenario: Rename the machine
- **WHEN** the user types a new machine name in the General tab
- **THEN** the config's `machineName` is updated, the tray's own status line reflects it right away, and the app, push and live status show the new name after the daemon's next start (the host name they are given is fixed for the process's lifetime, like the rest of `hello`)

#### Scenario: Start at login
- **WHEN** the user turns on "Start at login" under a service manager
- **THEN** the login service is installed, and off removes it

#### Scenario: No window support
- **WHEN** the helper does not report window support
- **THEN** "Preferences…" opens the config file, as before

## ADDED Requirements

### Requirement: Sessions window
On a helper that reports it can open windows (macOS), "See all sessions…" SHALL open a native **Sessions window**: a searchable table of every session (not only the ones shown in the menu) with its name, folder, agent, state and start time, updated live as the daemon's session list changes. Each row SHALL offer Focus (open in terminal/tmux), Rename…, Close session and Copy path; Copy path MUST work without a round trip to the daemon. The window SHALL filter as the user types, matching the name or the folder.

#### Scenario: Open from the menu
- **WHEN** the user picks "See all sessions…"
- **THEN** the Sessions window opens showing every live and recently ended session, including ones past the menu's cap

#### Scenario: Search
- **WHEN** the user types part of a folder name in the Sessions window's search field
- **THEN** only sessions whose name or folder match stay listed

#### Scenario: Copy path
- **WHEN** the user picks "Copy path" on a row
- **THEN** the folder path is on the clipboard, with no daemon round trip

### Requirement: Session rename from the tray
On a helper that reports it can open windows (macOS), each session SHALL offer a "Rename…" quick action in the tray menu and the Sessions window: a small prompt, pre-filled with the current title, asking for a new name. For a controllable session (a live tmux pane), the daemon SHALL deliver `/rename <name>` to the pane the same way it delivers any other text, so the agent (Claude Code or Codex, each handling its own `/rename`) records the name itself; the daemon's existing transcript-derived title keeps tracking it afterward, with no separate rename storage for controllable sessions. For a session with no live pane, the daemon SHALL keep the given name as an alias shown instead of the title until the session is resumed and controllable again, at which point the alias is sent as `/rename` and cleared.

#### Scenario: Rename a controllable session
- **WHEN** the user renames a running session to "rate limit bug"
- **THEN** `/rename rate limit bug` is sent to its tmux pane and the session's title updates once the agent records it

#### Scenario: Rename a session with no live pane
- **WHEN** the user renames an ended (not yet resumed) session
- **THEN** the tray and the Sessions window show the new name right away as an alias, with no pane to send it to

#### Scenario: Resuming an aliased session
- **WHEN** a session with a pending alias becomes controllable again
- **THEN** the daemon sends the alias as `/rename` to the new pane and stops treating it as a separate alias
