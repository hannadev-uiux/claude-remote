## MODIFIED Requirements

### Requirement: Message catalog
The protocol SHALL define the client messages `auth`, `sessions.list`, `session.subscribe`, `session.unsubscribe`, `session.history`, `session.input` (with its delivery `mode`: `now`, `queue` or `auto`), `session.key`, `session.setMode`, `session.close`, `attachment.upload`, `permission.respond`, `permission.answer`, `queue.update`, `queue.remove`, `queue.sendNow`, `queue.flush`, `device.register`, `device.unregister`, `files.search`, `commands.list`, `projects.list`, `directories.list`, `models.list`, `provider.status`, `session.start` (with an optional `model`), `session.resume`, `worktree.inspect`, `worktree.cleanup`, `pane.subscribe`, `pane.unsubscribe`, `pane.focus`, `settings.mute`, `app.visibility`, `daemon.update.check`, `daemon.update.start` and `ping`; and the server messages `auth.ok`, `sessions.snapshot`, `session.updated`, `session.removed`, `session.queue`, `transcript.entry`, `transcript.page`, `pane.frame`, `permission.request`, `permission.resolved`, `session.state`, `session.started`, `subagent.updated`, `files.results`, `commands.results`, `projects.results`, `directories.results`, `models.results`, `provider.info`, `attachment.uploaded`, `worktree.info`, `daemon.update.info`, `ack`, `error` and `pong`. `session.started` is the reply to `session.start` and carries `paneId` and `sessionId` (`string | null`): `sessionId` is `null` when the new session has not registered against the pane yet. `models.results` carries the profile id, the `ModelInfo` list (id, name, context length, prompt and completion prices in USD per million tokens, `tools`, `reasoning` and `caching` flags), when it was fetched and whether it is stale; `provider.info` carries the profile id, `hasKey` and the credits (`total`, `used`) or `null`. `daemon.update.info` carries the daemon's update info (version, channel, last check, available update, blocker, `busy`, last run) and is both the reply to `daemon.update.check` / `daemon.update.start` and the broadcast of run progress; `auth.ok` MAY carry `update: { channel }` when the daemon supports these messages. No message SHALL carry a provider key.

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

#### Scenario: New session registers before the reply
- **WHEN** a client sends `session.start` and the launched pane's `SessionStart` hook registers within the daemon's wait window
- **THEN** the daemon answers `session.started` with that pane's `paneId` and the registered `sessionId`

#### Scenario: New session still starting
- **WHEN** a client sends `session.start` and no session has registered against the launched pane by the end of the wait window
- **THEN** the daemon answers `session.started` with `paneId` and `sessionId: null`
