## ADDED Requirements

### Requirement: Android build
The app SHALL build and run on Android 10+ with the same features as on iOS: pairing by QR code, session list, conversation, permissions, autocomplete, raw terminal, lifecycle and mute.

#### Scenario: Pairing on Android
- **WHEN** the user scans the pairing QR code on an Android phone
- **THEN** the token is stored in SecureStore and the session list loads

### Requirement: Push on Android
The app SHALL register its FCM token with `platform: "android"`, request the notification permission on Android 13+, and show notifications in the `claude-remote` channel. Notifications MUST NOT carry session content.

#### Scenario: Permission request notification
- **WHEN** a session waits for permission and the Android phone is in the background
- **THEN** a high-priority notification in the `claude-remote` channel shows only the profile and the event

### Requirement: Android navigation
The hardware back button SHALL close the open sheet or modal first and otherwise navigate back.

#### Scenario: Back with the mode sheet open
- **WHEN** the mode selector is open and the user presses back
- **THEN** the selector closes and the conversation stays open

### Requirement: Platform-neutral texts
Texts and links SHALL not assume an iPhone: they say "phone" and point to the store of the current platform.

#### Scenario: Setup guide on Android
- **WHEN** the setup guide opens on Android
- **THEN** the Tailscale link points to Google Play
