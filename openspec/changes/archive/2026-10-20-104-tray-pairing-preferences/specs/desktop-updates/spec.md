## ADDED Requirements

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
