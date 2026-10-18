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
The protocol SHALL define the client messages `auth`, `sessions.list`, `session.subscribe`, `session.unsubscribe`, `session.history`, `session.input`, `session.key`, `session.setMode`, `attachment.upload`, `permission.respond`, `permission.answer`, `device.register`, `files.search`, `commands.list`, `projects.list`, `directories.list`, `session.start`, `session.resume`, `pane.subscribe`, `pane.unsubscribe`, `settings.mute`, `app.visibility` and `ping`; and the server messages `auth.ok`, `sessions.snapshot`, `session.updated`, `session.removed`, `transcript.entry`, `transcript.page`, `pane.frame`, `permission.request`, `permission.resolved`, `session.state`, `subagent.updated`, `files.results`, `commands.results`, `projects.results`, `directories.results`, `attachment.uploaded`, `ack`, `error` and `pong`.

#### Scenario: Unknown type
- **WHEN** a message arrives with a `type` outside the catalog
- **THEN** the parser returns an `unknown_type` error

### Requirement: Protocol version
The `auth` handshake SHALL include `protocolVersion`; the daemon MUST reject versions with a different major with a `protocol_mismatch` error.

#### Scenario: Incompatible version
- **WHEN** the app sends `protocolVersion` 2 and the daemon speaks version 1
- **THEN** the daemon responds with `error` `protocol_mismatch` and closes the connection

### Requirement: Image attachment messages
`attachment.upload` SHALL carry `sessionId`, `mimeType` (`image/jpeg`, `image/png`, `image/webp` or `image/gif`) and non-empty base64 `data`, and is answered with `attachment.uploaded` carrying `attachmentId`. `session.input` SHALL accept optional `attachmentIds` (1 to 4 ids) and an empty `text`. The error codes SHALL include `unsupported_media`.

#### Scenario: Upload message
- **WHEN** the client sends `attachment.upload` with `mimeType` "image/png" and base64 data
- **THEN** the message parses

#### Scenario: Unsupported type in the schema
- **WHEN** the client sends `attachment.upload` with `mimeType` "application/pdf"
- **THEN** the parser returns a `bad_request` error

#### Scenario: Too many attachments
- **WHEN** `session.input` carries 5 attachment ids
- **THEN** the parser returns a `bad_request` error

### Requirement: Transcript image messages
`user` and `tool_result` transcript entries SHALL carry `images`, a list of image refs with `id`, `mediaType` and `bytes`, defaulting to an empty list when absent. The client SHALL be able to send `transcript.image` with `sessionId`, an optional `agentId` and `imageId`, answered with `transcript.image` carrying `imageId`, `mediaType` and base64 `data`. Images larger than `MAX_TRANSCRIPT_IMAGE_BYTES` (5 MB) MUST be answered with `too_large`.

#### Scenario: Entry without images
- **WHEN** a `transcript.entry` with a `user` entry and no `images` field is validated
- **THEN** it is valid and `images` is an empty list

#### Scenario: Image request
- **WHEN** the client sends `transcript.image` with `sessionId` "s1" and `imageId` "12.0"
- **THEN** the message is valid and the daemon answers `transcript.image` with the image's media type and data
