# protocol Specification

## Purpose
Defines the contract for the messages exchanged over WebSocket between the mobile app and the daemon, with runtime validation on both sides.

## Requirements

### Requirement: Message envelope
Every message SHALL be a JSON object with a discriminating `type` field. Client messages that expect a response MUST carry an `id`; daemon responses MUST carry `replyTo` with that `id`.

#### Scenario: Correlated response
- **WHEN** the client sends `sessions.list` with `id` "abc"
- **THEN** the daemon responds with `sessions.snapshot` with `replyTo` "abc"

#### Scenario: Typed error
- **WHEN** a request fails
- **THEN** the daemon responds with `error` carrying `replyTo`, `code` and `message`

### Requirement: Tolerant validation
The parser SHALL reject malformed messages by returning an error result, without throwing, and SHALL ignore unknown fields.

#### Scenario: Invalid message
- **WHEN** `{"type":"session.input"}` arrives without `sessionId`
- **THEN** the parser returns a validation error and the process keeps running

#### Scenario: Extra field
- **WHEN** a valid message arrives with one extra field
- **THEN** the message is accepted and the extra field is discarded

### Requirement: Message catalog
The protocol SHALL define the client messages `auth`, `sessions.list`, `session.subscribe`, `session.unsubscribe`, `session.history`, `session.input`, `session.key`, `session.setMode`, `permission.respond`, `device.register`, `files.search`, `commands.list`, `projects.list`, `session.start`, `session.resume`, `pane.subscribe`, `pane.unsubscribe`, `settings.mute`, `app.visibility` and `ping`; and the server messages `auth.ok`, `sessions.snapshot`, `session.updated`, `session.removed`, `transcript.entry`, `transcript.page`, `pane.frame`, `permission.request`, `permission.resolved`, `session.state`, `subagent.updated`, `files.results`, `commands.results`, `projects.results`, `ack`, `error` and `pong`.

#### Scenario: Unknown type
- **WHEN** a message arrives with a `type` outside the catalog
- **THEN** the parser returns an `unknown_type` error

### Requirement: Protocol version
The `auth` handshake SHALL include `protocolVersion`; the daemon MUST reject versions with a different major with a `protocol_mismatch` error.

#### Scenario: Incompatible version
- **WHEN** the app sends `protocolVersion` 2 and the daemon speaks version 1
- **THEN** the daemon responds with `error` `protocol_mismatch` and closes the connection
