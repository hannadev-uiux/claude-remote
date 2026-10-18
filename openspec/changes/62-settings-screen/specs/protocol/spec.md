## MODIFIED Requirements

### Requirement: Message catalog
The protocol SHALL define the client messages `auth`, `sessions.list`, `session.subscribe`, `session.unsubscribe`, `session.history`, `session.input` (with its delivery `mode`: `now`, `queue` or `auto`), `session.key`, `session.setMode`, `session.close`, `attachment.upload`, `permission.respond`, `permission.answer`, `queue.update`, `queue.remove`, `queue.sendNow`, `queue.flush`, `device.register`, `device.unregister`, `files.search`, `commands.list`, `projects.list`, `directories.list`, `session.start`, `session.resume`, `worktree.inspect`, `worktree.cleanup`, `pane.subscribe`, `pane.unsubscribe`, `settings.mute`, `app.visibility` and `ping`; and the server messages `auth.ok`, `sessions.snapshot`, `session.updated`, `session.removed`, `session.queue`, `transcript.entry`, `transcript.page`, `pane.frame`, `permission.request`, `permission.resolved`, `session.state`, `subagent.updated`, `files.results`, `commands.results`, `projects.results`, `directories.results`, `attachment.uploaded`, `worktree.info`, `ack`, `error` and `pong`.

#### Scenario: Unknown type
- **WHEN** a message arrives with a `type` outside the catalog
- **THEN** the parser returns an `unknown_type` error

#### Scenario: Queue messages
- **WHEN** a client sends `queue.sendNow` with a session id and an item id
- **THEN** the message is accepted, and one with a `mode` outside `now`, `queue`, `auto` on `session.input` is rejected with `bad_request`

#### Scenario: Forget a phone
- **WHEN** a client sends `device.unregister` with its FCM token
- **THEN** the message is accepted and the daemon drops that token
