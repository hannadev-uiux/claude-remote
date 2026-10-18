## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Push visibility and test
The daemon SHALL report its push mode (`firebase`, `relay` or `off`) in `auth.ok`, and `remote-harness doctor` and `remote-harness push status` SHALL print it with the number of registered phones. The app SHALL show a Notifications card in Settings with the daemon's mode, this phone's state (permission, registration, relay grant) and what is missing when push cannot work, plus a "Send test notification" button. A test (`push.test`) MUST go only to the requesting phone, even with the app in the foreground, carry no session content, and answer `sent`, `off`, `unregistered` or `failed`. `remote-harness push test` SHALL send a test to every registered phone. All texts MUST be translated.

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
