# notification-mute Specification

## Purpose
Allows muting push notifications from specific profiles or sessions.

## Requirements

### Requirement: Mute
`settings.mute` SHALL add or remove a profile or session from the mute list, persisted in the daemon; events from muted targets MUST NOT produce push. Permission requests from muted targets still appear in the app.

#### Scenario: Muted profile
- **WHEN** the `claudin` profile is muted and one of its sessions finishes
- **THEN** no push is sent

#### Scenario: Unmute
- **WHEN** the user unmutes the profile
- **THEN** subsequent events produce push again

### Requirement: Controls in the app
The app SHALL show per-profile toggles in settings and a mute button in the session header, reflecting the state received from the daemon in `auth.ok`.

#### Scenario: Mute a session
- **WHEN** the user taps the session's bell
- **THEN** the app sends `settings.mute` and the icon changes to muted
