# push-notifications Specification

## Purpose
Alerts the paired device when a session needs attention, without exposing session content to external services.

## Requirements

### Requirement: Device registration
The app SHALL request notification permission, obtain the FCM token and send `device.register`; the daemon MUST store only tokens received over authenticated connections.

#### Scenario: Token refreshed
- **WHEN** FCM refreshes the token
- **THEN** the app sends the new token and the daemon replaces the old one

### Requirement: Push delivery
The daemon SHALL send a push to the registered tokens when a session finishes a turn (`Stop`), receives `Notification` or produces a permission request, unless a connected client has the app in the foreground. With a Firebase service account file the daemon SHALL send directly to FCM; without one it SHALL send through the push relay with each phone's grant. The config `push: "off"` (also set by `remote-harness push off`) MUST stop every push, live status updates included, and MUST apply to a running daemon without a restart.

#### Scenario: Session finishes
- **WHEN** `Stop` arrives and the app is in the background
- **THEN** the device receives "Session finished" with the profile

#### Scenario: Firebase not configured
- **WHEN** there is no service account and the phone registered with a relay grant
- **THEN** the daemon sends the push through the relay

#### Scenario: Turned off
- **WHEN** the user runs `remote-harness push off`
- **THEN** the running daemon sends no more pushes or live status updates until `remote-harness push on`

### Requirement: Content-free payload
The payload MUST contain only a generic title, the profile name, `sessionId`, the event type and `requestId` when present; never prompts, commands or paths.

#### Scenario: Permission request
- **WHEN** a `Bash` call asks for permission
- **THEN** the push says "Permission pending" and the profile, without the command

### Requirement: Deep link and actions
Tapping the notification SHALL open the session; the "Allow"/"Deny" actions MUST answer the request by connecting to the daemon in the background. Requests with an `interaction` (question or plan) MUST NOT offer these actions.

#### Scenario: Deny from the notification
- **WHEN** the user taps "Deny" on the notification
- **THEN** the app sends `permission.respond` with `deny`

#### Scenario: Question without actions
- **WHEN** Claude asks a question and the app is in the background
- **THEN** the push has no Allow/Deny actions and tapping it opens the session

### Requirement: Interactive request title
The push for a request with an `interaction` SHALL use a generic title saying Claude is waiting for an answer (question) or for a plan review (plan), never the question or plan content.

#### Scenario: Plan ready
- **WHEN** `ExitPlanMode` reaches the daemon with the app in the background
- **THEN** the device receives "Plan ready for review" with the profile name

### Requirement: Push visibility and test
The daemon SHALL report its push mode (`firebase`, `relay` or `off`) in `auth.ok`, and `remote-harness doctor` and `remote-harness push status` SHALL print it with the number of registered phones. The app SHALL show, in the Notifications card of Settings, a `Push notifications` toggle for this phone (on by default, kept on the device, with the hint that only this phone is notified and never with the conversation). While it is on, the card SHALL show the daemon's mode, this phone's state (permission, registration, relay grant), what is missing when push cannot work, and a "Send test notification" button. Turning it off SHALL send `device.unregister` with the phone's token, after which the daemon MUST drop that token from its registry, and the app MUST NOT register again (nor on token refresh) until the toggle is on. A test (`push.test`) MUST go only to the requesting phone, even with the app in the foreground, carry no session content, and answer `sent`, `off`, `unregistered` or `failed`. `remote-harness push test` SHALL send a test to every registered phone. All texts MUST be translated.

#### Scenario: Test from the app
- **WHEN** the user taps "Send test notification" with push working
- **THEN** a test notification appears on that phone and the card says it was sent

#### Scenario: Permission denied
- **WHEN** notifications are denied for the app
- **THEN** the card says so and offers to open the system settings

#### Scenario: Build without relay
- **WHEN** the daemon is in relay mode and the app build has no relay
- **THEN** the card says the computer needs a Firebase service account

#### Scenario: Older daemon
- **WHEN** the daemon does not report a push mode
- **THEN** the mode is shown as unknown and the test button is hidden

#### Scenario: Push off on this phone
- **WHEN** the user turns `Push notifications` off
- **THEN** the app sends `device.unregister`, the daemon no longer counts or targets that phone, and the status and test controls are hidden until the toggle is on again
