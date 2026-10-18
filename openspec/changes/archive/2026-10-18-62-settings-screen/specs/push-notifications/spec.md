## MODIFIED Requirements

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
