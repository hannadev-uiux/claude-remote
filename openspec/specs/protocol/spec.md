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
The protocol SHALL define the client messages `auth`, `sessions.list`, `session.subscribe`, `session.unsubscribe`, `session.history`, `session.input` (with its delivery `mode`: `now`, `queue` or `auto`), `session.key`, `session.setMode`, `session.close`, `attachment.upload`, `permission.respond`, `permission.answer`, `queue.update`, `queue.remove`, `queue.sendNow`, `queue.flush`, `device.register`, `device.unregister`, `files.search`, `commands.list`, `projects.list`, `directories.list`, `models.list`, `provider.status`, `session.start` (with an optional `model`), `session.resume`, `worktree.inspect`, `worktree.cleanup`, `pane.subscribe`, `pane.unsubscribe`, `pane.focus`, `settings.mute`, `app.visibility`, `daemon.update.check`, `daemon.update.start` and `ping`; and the server messages `auth.ok`, `sessions.snapshot`, `session.updated`, `session.removed`, `session.queue`, `transcript.entry`, `transcript.page`, `pane.frame`, `permission.request`, `permission.resolved`, `session.state`, `subagent.updated`, `files.results`, `commands.results`, `projects.results`, `directories.results`, `models.results`, `provider.info`, `attachment.uploaded`, `worktree.info`, `daemon.update.info`, `ack`, `error` and `pong`. `models.results` carries the profile id, the `ModelInfo` list (id, name, context length, prompt and completion prices in USD per million tokens, `tools`, `reasoning` and `caching` flags), when it was fetched and whether it is stale; `provider.info` carries the profile id, `hasKey` and the credits (`total`, `used`) or `null`. `daemon.update.info` carries the daemon's update info (version, channel, last check, available update, blocker, `busy`, last run) and is both the reply to `daemon.update.check` / `daemon.update.start` and the broadcast of run progress; `auth.ok` MAY carry `update: { channel }` when the daemon supports these messages. No message SHALL carry a provider key.

#### Scenario: Unknown type
- **WHEN** a message arrives with a `type` outside the catalog
- **THEN** the parser returns an `unknown_type` error

#### Scenario: Queue messages
- **WHEN** a client sends `queue.sendNow` with a session id and an item id
- **THEN** the message is accepted, and one with a `mode` outside `now`, `queue`, `auto` on `session.input` is rejected with `bad_request`

#### Scenario: Forget a phone
- **WHEN** a client sends `device.unregister` with its FCM token
- **THEN** the message is accepted and the daemon drops that token

#### Scenario: Focus a pane
- **WHEN** a client sends `pane.focus` with a session id
- **THEN** the message is accepted and answered with `ack` once the pane is selected

#### Scenario: Provider messages
- **WHEN** a client sends `models.list` with a profile id
- **THEN** the message is accepted and the daemon answers `models.results` with the models, `fetchedAt` and `stale`

#### Scenario: Daemon update messages
- **WHEN** a client sends `daemon.update.start` with channel `main`
- **THEN** the message is accepted, and one with a channel outside `main`, `development` is rejected with `bad_request`

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

### Requirement: Live status palette
`LiveStatusProps` SHALL accept an optional `palette` object with the hex colors `background`, `text`, `textMuted`, `accent`, `success` and `warning`, and `live.register` SHALL accept the same optional `palette`. Messages without it MUST keep parsing.

#### Scenario: Registration with a palette
- **WHEN** the app sends `live.register` with `palette.accent` "#E8A33D"
- **THEN** the message parses and the palette is available to the daemon

#### Scenario: Props without a palette
- **WHEN** a daemon sends `LiveStatusProps` without `palette`
- **THEN** the props parse with `palette` undefined

### Requirement: Close and worktree messages
The protocol SHALL define the client messages `session.close { sessionId, worktree? }` (answered with `ack` carrying `{ closed: 'exited' | 'killed' | 'already', worktree?: 'deleted' | 'kept' }`), `worktree.inspect { sessionId }` (answered with `worktree.info { worktree: WorktreeInfo | null }`) and `worktree.cleanup { sessionId, action }` (answered with `ack`). `WorktreeInfo` SHALL carry `path`, `branch` (nullable), `mainRoot`, `dirty` and `unpushed` (non-negative integers). `action` and the `worktree` option SHALL be one of `delete`, `push-delete`, `discard-delete`.

#### Scenario: Close with cleanup
- **WHEN** the client sends `session.close` with `worktree: "push-delete"`
- **THEN** the message parses

#### Scenario: Unknown action
- **WHEN** the client sends `worktree.cleanup` with `action: "wipe"`
- **THEN** the parser returns a `bad_request` error
