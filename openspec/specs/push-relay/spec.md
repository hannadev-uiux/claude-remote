# push-relay Specification

## Purpose
TBD - created by archiving change 37-push-relay. Update Purpose after archive.

## Requirements

### Requirement: Push grants
The relay SHALL expose `POST /grant` that takes `{ fcmToken, platform, activityToken? }` and answers `{ grant }`, where the grant seals those values with an authenticated cipher under a server-side secret. When App Check enforcement is on, a request without a valid App Check token MUST be rejected with `401`; in monitor mode it SHALL be allowed and logged.

#### Scenario: Grant for a phone
- **WHEN** the app posts its FCM token and a valid App Check token to `/grant`
- **THEN** it receives a grant that does not reveal the token

#### Scenario: Enforced App Check
- **WHEN** App Check enforcement is on and a request has no App Check token
- **THEN** the relay answers `401` and issues no grant

### Requirement: Relayed sending
The relay SHALL expose `POST /send` that takes `{ grant, message }`, sends `message` through FCM to the token sealed in the grant, and sets the Live Activity token from the grant. It MUST reject an invalid grant (`403`), a message that names its own target (`topic`, `condition`, `tokens`), a message over 8 KB (`400`), and requests over the per-grant rate limit (`429`). An unregistered token MUST answer `410`.

#### Scenario: A daemon cannot pick the target
- **WHEN** a daemon sends a message with `token` set to another phone's token together with its own grant
- **THEN** the relay sends only to the token in the grant

#### Scenario: Token gone
- **WHEN** FCM reports the grant's token as unregistered
- **THEN** the relay answers `410` and the daemon drops that device

### Requirement: Relay registration
`device.register` and `live.register` SHALL accept an optional `relay: { url, grant }` (HTTPS URL). An app built with a relay URL SHALL obtain a grant for its FCM token (and for each Live Activity token) and send it with the registration; a failure to obtain a grant MUST NOT block the registration.

#### Scenario: Live Activity through the relay
- **WHEN** the app starts a Live Activity and registers it with a relay grant that includes the activity token
- **THEN** the daemon's live status updates reach that activity through the relay

### Requirement: Daemon sender selection
The daemon SHALL send through Firebase directly when a service account file exists, and through the relay otherwise, using each device's grant and skipping devices without one. No Firebase credential MUST be needed on the computer in relay mode.

#### Scenario: No service account
- **WHEN** the daemon has no service account and a registered phone sent a relay grant
- **THEN** notifications for that phone are posted to the relay's `/send`
