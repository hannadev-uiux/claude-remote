# desktop-updates Specification

## Purpose
Keeps the installed daemon up to date from the computer: update channel, background check with desktop notifications, opt-in automatic updates and a tray icon.

## Requirements

### Requirement: Update channel
The daemon config SHALL hold `update.channel` (`main` by default, or `development`) and `update.auto` (off by default). `remote-harness update` SHALL follow the channel unless `--ref` or `REMOTE_HARNESS_REF` is given. `remote-harness updates channel <name>` and `remote-harness updates auto <on|off>` SHALL change the config and apply it to the running daemon without a restart. When the fetched version is lower than the running one, the CLI and the notification MUST say it is an older version before installing.

#### Scenario: Follow development
- **WHEN** the user runs `remote-harness updates channel development` and then `remote-harness update`
- **THEN** the update installs the `development` branch

#### Scenario: Back to main
- **WHEN** the channel goes from `development` to `main` and `main` has an older version
- **THEN** the update warns that it installs an older version before applying it

### Requirement: Background update check
In the installer's checkout only, the daemon SHALL check the channel's ref on the git remote shortly after start and then every 6 hours, with no network calls besides the git remote. When a newer commit exists it SHALL show a native desktop notification with the new version, once per commit. A development clone MUST never be checked or updated automatically.

#### Scenario: New version
- **WHEN** `main` gets a new commit with version 0.12.0
- **THEN** the computer shows "Remote Harness 0.12.0 available" once

#### Scenario: Development clone
- **WHEN** the daemon runs from a development clone
- **THEN** no check runs

### Requirement: Automatic updates
With `update.auto` on, the daemon SHALL apply an available update when no session is running or waiting and no permission request is pending, by running the `remote-harness update` flow in a process that survives the service restart. A downgrade MUST NOT be applied automatically.

#### Scenario: Quiet moment
- **WHEN** an update is available, automatic updates are on and every session is idle
- **THEN** the daemon updates and the service restarts on the new version

#### Scenario: Busy
- **WHEN** a session is running
- **THEN** the update waits until it is idle

### Requirement: Tray icon
When a supported helper is available (macOS menu bar; Linux AppIndicator), the service daemon SHALL show a tray icon whose glyph encodes only the state: the mark as a template image when idle, the ring filled while any session works, an amber dot (the only color) while a permission waits, and 40 % opacity when the daemon is gone. The menu SHALL show, top to bottom: the status (`machine · version · since HH:MM`); **Waiting for you** with the oldest pending tool permission (`session title · Tool · detail`) and Allow, Always allow (when the daemon suggested a rule, saved like the app does), Deny and Focus in tmux; **Sessions** by recency, each as `title · state` with its folder, profile and worktree, Focus in tmux and Close session (the graceful close), the ended ones collapsed in one submenu; **Phones** with the number of registered phones and whether push is on; New session…, Pair a phone…, Open the docs and Preferences…; then "Check for updates", "Update now" (when an update is available), the automatic updates toggle, the channel choice, "Open logs", "Restart daemon" (under a service manager), "Run doctor" and "Quit tray". The menu SHALL refresh on session and permission changes. Without a helper the daemon MUST keep working headless. `tray: false` in the config SHALL disable it. All labels MUST be translated. The SwiftUI popover, the pairing QR, the Preferences window and the Windows tray are not part of this requirement.

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
- **WHEN** the user picks "Focus in tmux" on a session
- **THEN** the daemon selects that session's tmux window and pane

#### Scenario: Working glyph
- **WHEN** a session is running and nothing waits
- **THEN** the menu bar shows the mark with its ring filled, as a template image
