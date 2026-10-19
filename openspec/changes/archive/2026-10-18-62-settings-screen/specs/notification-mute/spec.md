## MODIFIED Requirements

### Requirement: Controls in the app
The app SHALL show the per-profile mute toggles in Settings (in each profile's details sheet and in the Muted sheet of the Notifications card), list the muted sessions in the Muted sheet with an Unmute action, and keep the mute button in the session header, all reflecting the state received from the daemon in `auth.ok` and in `mute.updated`.

#### Scenario: Mute a session
- **WHEN** the user taps the session's bell
- **THEN** the app sends `settings.mute` and the icon changes to muted

#### Scenario: Unmute from Settings
- **WHEN** the user opens the Muted sheet and taps Unmute on a session
- **THEN** the app sends `settings.mute` with `muted: false` and the session leaves the list
