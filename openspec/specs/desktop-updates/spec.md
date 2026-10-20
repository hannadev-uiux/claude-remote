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
In the installer's checkout only, the daemon SHALL check the channel's ref on the git remote shortly after start and then every 6 hours, with no network calls besides the git remote. When a newer commit exists it SHALL show a native desktop notification with the new version, once per commit. A development clone MUST never be checked or updated automatically. The checker and `remote-harness update` SHALL use the same rule (the channel's commit differs from the checked-out commit), and a saved result whose available commit is already checked out MUST be dropped when the daemon starts.

#### Scenario: New version
- **WHEN** `main` gets a new commit with version 0.12.0
- **THEN** the computer shows "Remote Harness 0.12.0 available" once

#### Scenario: Development clone
- **WHEN** the daemon runs from a development clone
- **THEN** no check runs

#### Scenario: Restart after an update
- **WHEN** the daemon restarts after updating to commit `396f527` and its saved check still names `396f527` as available
- **THEN** it offers no update until the channel moves to another commit

### Requirement: Automatic updates
With `update.auto` on, the daemon SHALL apply an available update when no session is running or waiting and no permission request is pending, by running the `remote-harness update` flow in a process that survives the service restart. A downgrade MUST NOT be applied automatically.

#### Scenario: Quiet moment
- **WHEN** an update is available, automatic updates are on and every session is idle
- **THEN** the daemon updates and the service restarts on the new version

#### Scenario: Busy
- **WHEN** a session is running
- **THEN** the update waits until it is idle

### Requirement: Tray icon
When a supported helper is available (macOS menu bar; Linux AppIndicator), the service daemon SHALL show a tray icon whose glyph encodes only the state: the mark as a template image when idle, the ring filled while any session works, an amber dot (the only color) while a permission waits, and 40 % opacity when the daemon is gone. The menu SHALL show, top to bottom: the status (`machine · version · since HH:MM`); **Waiting for you** with the oldest pending tool permission (`session title · Tool · detail`) and Allow, Always allow (when the daemon suggested a rule, saved like the app does), Deny and Open in terminal (tmux); **Sessions** by recency, each as `title · state` with its folder, profile and worktree, Open in terminal (tmux) and Close session (the graceful close), the ended ones collapsed in one submenu; **Phones** with the number of registered phones and whether push is on; New session…, Pair a phone…, Open the docs and Preferences…; then "Check for updates", "Update now" (when an update is available), the automatic updates toggle, the channel choice, "Open logs", "Restart daemon" (under a service manager), "Run doctor" and "Quit tray". The menu SHALL refresh on session and permission changes. Without a helper the daemon MUST keep working headless. `tray: false` in the config SHALL disable it. All labels MUST be translated. The SwiftUI popover, a Preferences window and the Windows tray are not part of this requirement; Pair a phone, Preferences and Quit have their own requirements below.

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

### Requirement: Update from the app
The daemon SHALL answer `daemon.update.check` with its update info (running version, channel, last check, the available update and whether it is a downgrade, what blocks updating, whether sessions are busy, and the last or current run), saving a given channel to the config first. It SHALL answer `daemon.update.start` by running the `remote-harness update` flow for the channel in a process that survives the service restart, and broadcast `daemon.update.info` whenever the run changes. It MUST refuse to start when it does not run from the installer's checkout, when it runs from sources, when it is not under a service manager, when a run is in progress or when no update is available, saying why. The refusal MUST be checked before a run is recorded, so a refused start leaves no failed run, and the reply SHALL say "an update is already running", "cannot update: <blocker>" or "already up to date". The daemon MUST be able to start a later update after the updater exited without restarting it (for example "Already up to date"), and it SHALL check the channel again right away in that case. A failure to start the updater SHALL be recorded as a failed run with its error. The app SHALL show these reasons translated, and an update that keeps the version but has a newer commit as "<version> · new commits (<commit>)".

#### Scenario: Update from the phone
- **WHEN** the app sends `daemon.update.start` for `main` and 0.13.0 is available
- **THEN** the app receives `fetching`, `building` and `restarting`, the daemon restarts, and after reconnecting the app sees 0.13.0 with the run `done`

#### Scenario: Development clone
- **WHEN** the daemon runs from a development clone
- **THEN** the info says `not-installer` and `daemon.update.start` is refused

#### Scenario: Switch channel
- **WHEN** the app checks with channel `development`
- **THEN** the config's `update.channel` becomes `development` and the info shows the development version

#### Scenario: Updater found nothing to do
- **WHEN** an update run ends with "Already up to date" and exit code 0, and later the checker finds `bcf5378` on `development`
- **THEN** "Update the computer" starts the updater for `bcf5378`

#### Scenario: Refused while running
- **WHEN** the app asks to update while an update runs
- **THEN** the request is refused with "an update is already running" and no failed run is recorded

#### Scenario: Same version, newer commit
- **WHEN** the running version is 0.13.0 and `development` has 0.13.0 at commit `bcf5378`
- **THEN** the app reads "0.13.0 · new commits (bcf5378) is available"

### Requirement: Update run record
`remote-harness update` SHALL record each step of the run (`fetching`, `building`, `restarting`, `done` or `failed`) with the versions, the commit, the error and whether it rolled back, wherever it was started. When building the new version fails, it SHALL check out and rebuild the previous commit before reporting the failure, so the service never restarts into a broken build. The daemon SHALL mark a run left at `restarting` as `done` when it starts.

#### Scenario: Build fails
- **WHEN** the new version fails to build
- **THEN** the checkout returns to the previous commit, it is rebuilt, the daemon keeps running and the run is `failed` with `rolledBack: true`

### Requirement: Pair a phone from the tray
Once the daemon listens for the app, the tray's "Pair a phone" SHALL be a submenu with: on macOS, the pairing QR code (the same link `remote-harness pair` shows); the `host:port` of the daemon; "Show the pairing in the terminal"; and "Rotate token…", whose nested confirmation rotates the token and closes every app connection, so paired phones must pair again. Before the daemon listens, "Pair a phone…" SHALL keep opening the pairing in the terminal. All labels MUST be translated.

#### Scenario: QR in the menu bar
- **WHEN** the user opens Pair a phone on a Mac whose daemon listens on `100.64.0.2:7337`
- **THEN** the submenu shows the QR code of `claude-remote://pair?host=100.64.0.2&port=7337&token=…` and the line `100.64.0.2:7337`

#### Scenario: Rotate the token
- **WHEN** the user confirms "Rotate and sign out the paired phones"
- **THEN** a new token is stored, the app connections close, and the QR shows the new token

### Requirement: Tray preferences
The tray's Preferences SHALL be a submenu with:
- "Show permission requests here": the config key `trayPermissions`, on by default. When off, the menu keeps "Waiting for you" and Open in terminal but MUST NOT offer Allow, Always allow or Deny.
- "Keep the computer awake" with the `off`, `sessions` and `always` modes.
- "Push notifications": `push` `auto` when checked, `off` when not.
- "Open the config file…".

Each change SHALL be written to the config file (read → merge → atomic write) and applied without restarting the daemon.

#### Scenario: Turn push off from the menu bar
- **WHEN** the user unchecks "Push notifications"
- **THEN** the config has `push: "off"` and the daemon sends no more pushes until it is turned on again

#### Scenario: Permissions only in the app
- **WHEN** "Show permission requests here" is off and a permission waits
- **THEN** the menu shows the waiting request with Open in terminal and no Allow / Deny

### Requirement: Quit the tray or the service
Under a service manager, the tray's Quit SHALL be a submenu with "Hide the icon (the service keeps running)" and "Stop the service until the next login". The latter MUST stop the service (`launchctl bootout` on macOS, `systemctl --user stop` on Linux) without uninstalling it, so it starts again at the next login. A daemon not under a service manager SHALL keep the single "Quit tray" item.

#### Scenario: Stop the service
- **WHEN** the user picks "Stop the service until the next login" on macOS
- **THEN** the icon disappears, the LaunchAgent is booted out and the daemon stops; it starts again at the next login
