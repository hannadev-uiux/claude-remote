## Purpose

Alerts the paired device when a session needs attention, without exposing session content to external services.

## ADDED Requirements

### Requirement: Device registration
The app SHALL request notification permission, obtain the FCM token and send `device.register`; the daemon MUST store only tokens received over authenticated connections.

#### Scenario: Token refreshed
- **WHEN** FCM refreshes the token
- **THEN** the app sends the new token and the daemon replaces the old one

### Requirement: Push delivery
The daemon SHALL send a push to the registered tokens when a session finishes a turn (`Stop`), receives `Notification` or produces a permission request, unless a connected client has the app in the foreground. Without Firebase configuration, the daemon MUST keep working without push.

#### Scenario: Session finishes
- **WHEN** `Stop` arrives and the app is in the background
- **THEN** the device receives "Session finished" with the profile

#### Scenario: Firebase not configured
- **WHEN** there is no service account
- **THEN** the daemon logs a warning and does not send push

### Requirement: Content-free payload
The payload MUST contain only a generic title, the profile name, `sessionId`, the event type and `requestId` when present; never prompts, commands or paths.

#### Scenario: Permission request
- **WHEN** a `Bash` call asks for permission
- **THEN** the push says "Permission pending" and the profile, without the command

### Requirement: Deep link and actions
Tapping the notification SHALL open the session; the "Allow"/"Deny" actions MUST answer the request by connecting to the daemon in the background.

#### Scenario: Deny from the notification
- **WHEN** the user taps "Deny" on the notification
- **THEN** the app sends `permission.respond` with `deny`
