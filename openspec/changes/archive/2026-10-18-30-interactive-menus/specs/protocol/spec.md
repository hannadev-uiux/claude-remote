## MODIFIED Requirements

### Requirement: Message catalog
The protocol SHALL define the client messages `auth`, `sessions.list`, `session.subscribe`, `session.unsubscribe`, `session.history`, `session.input`, `session.key`, `session.setMode`, `attachment.upload`, `permission.respond`, `permission.answer`, `device.register`, `files.search`, `commands.list`, `projects.list`, `session.start`, `session.resume`, `pane.subscribe`, `pane.unsubscribe`, `settings.mute`, `app.visibility` and `ping`; and the server messages `auth.ok`, `sessions.snapshot`, `session.updated`, `session.removed`, `transcript.entry`, `transcript.page`, `pane.frame`, `permission.request`, `permission.resolved`, `session.state`, `subagent.updated`, `files.results`, `commands.results`, `projects.results`, `attachment.uploaded`, `ack`, `error` and `pong`.

#### Scenario: Unknown type
- **WHEN** a message arrives with a `type` outside the catalog
- **THEN** the parser returns an `unknown_type` error
