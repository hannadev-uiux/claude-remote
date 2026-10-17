# app-shell Specification

## Purpose
Provides the foundation of the mobile app: terminal visual identity, navigation and a resilient connection to the daemon.

## Requirements

### Requirement: Dark terminal theme
The app SHALL use only a dark theme with a monospaced font and Claude orange as the accent, regardless of the system theme.

#### Scenario: iPhone in light mode
- **WHEN** the system is in light mode
- **THEN** the app keeps the dark theme

### Requirement: App icon
The app SHALL have an icon with the Claude Code symbol in the foreground over a terminal with `>_` in the background.

#### Scenario: iPhone home screen
- **WHEN** the app is installed
- **THEN** the icon shown is the Remote Harness icon

### Requirement: Authenticated connection
When starting with paired credentials, the app SHALL connect to the daemon and send `auth` as the first message; without credentials, it MUST open the pairing screen.

#### Scenario: Not paired
- **WHEN** the app opens for the first time
- **THEN** the pairing screen is shown

### Requirement: Automatic reconnection
When the connection is lost, the app SHALL try to reconnect with exponential backoff (1 s up to 30 s), reconnect immediately when returning to the foreground, and resubscribe to open sessions with the last cursor received.

#### Scenario: Network change
- **WHEN** the phone switches from Wi-Fi to 4G
- **THEN** the app reconnects and the conversation continues from where it left off, without duplicate messages

#### Scenario: Connection indicator
- **WHEN** the connection drops
- **THEN** the app shows the "reconnecting" state at the top

### Requirement: Requests with timeout
Requests SHALL be correlated by `id` and fail with an error after 15 s without a response.

#### Scenario: Daemon does not respond
- **WHEN** a request goes 15 s without a response
- **THEN** the promise is rejected with a timeout error
