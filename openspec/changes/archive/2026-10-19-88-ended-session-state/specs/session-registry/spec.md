## MODIFIED Requirements

### Requirement: Event-driven state
The daemon SHALL update the session state from the hooks: `SessionStart` → `idle`; `UserPromptSubmit` → `running`; `Stop` → `idle`; `Notification`/`PermissionRequest` → `waiting`; `SessionEnd` → `ended`. Once a session is `ended` (by `SessionEnd`, a dead pane, a close, being replaced in its pane or a resume whose pane closed), only `SessionStart` or a `UserPromptSubmit` from a tmux pane MAY change its state, pane or controllability; later hooks MUST NOT move it back to `waiting`, `running` or `idle`. A resolved permission request SHALL set `running` only on a session that is not `ended`. When a session becomes `ended`, its pending permission requests MUST be cancelled, its live status MUST end, and hooks that arrive later MUST NOT send pushes or live status updates. Each change MUST be sent to clients as `session.updated`.

#### Scenario: Permission request
- **WHEN** a `Notification` of type `permission_prompt` arrives
- **THEN** the session becomes `waiting` and clients receive `session.updated`

#### Scenario: Late notification after /exit
- **WHEN** a session got `SessionEnd` and then an idle `Notification` from the same pane arrives
- **THEN** the session stays `ended` and read-only, and no "waiting" push is sent

#### Scenario: /exit with a pending permission
- **WHEN** a session has a pending permission request and ends
- **THEN** the request is cancelled, its resolution does not set the session `running`, and the session stays `ended`

#### Scenario: Pane gone while waiting
- **WHEN** a waiting session's pane disappears
- **THEN** the session becomes `ended` and leaves the waiting state

#### Scenario: Resumed
- **WHEN** an ended session is resumed and its `SessionStart` arrives from the new pane
- **THEN** the session becomes `idle` and controllable again
