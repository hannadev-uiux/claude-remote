## MODIFIED Requirements

### Requirement: Message catalog
The protocol SHALL define the client messages `auth`, `sessions.list`, `session.subscribe`, `session.unsubscribe`, `session.history`, `session.input`, `session.key`, `session.setMode`, `attachment.upload`, `permission.respond`, `permission.answer`, `device.register`, `files.search`, `commands.list`, `projects.list`, `session.start`, `session.resume`, `pane.subscribe`, `pane.unsubscribe`, `settings.mute`, `app.visibility` and `ping`; and the server messages `auth.ok`, `sessions.snapshot`, `session.updated`, `session.removed`, `transcript.entry`, `transcript.page`, `pane.frame`, `permission.request`, `permission.resolved`, `session.state`, `subagent.updated`, `files.results`, `commands.results`, `projects.results`, `attachment.uploaded`, `ack`, `error` and `pong`.

#### Scenario: Unknown type
- **WHEN** a message arrives with a `type` outside the catalog
- **THEN** the parser returns an `unknown_type` error

## ADDED Requirements

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
