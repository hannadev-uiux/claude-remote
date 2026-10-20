## MODIFIED Requirements

### Requirement: Timeout without decision
If no response arrives before the configured limit (lower than the hook timeout), the daemon SHALL answer the hook without a decision and hand the request over to the terminal instead of resolving it. The limit SHALL be `questionTimeoutSec` (default 3300) for interactive requests (questions and plan approvals) and `permissionTimeoutSec` (default 280) for the others. The daemon MUST log the handover with the tool name only.

#### Scenario: Phone does not respond
- **WHEN** the timeout of a tool permission expires
- **THEN** the permission dialog stays in the TUI, the clients receive the request again with `terminal: true`, and no `permission.resolved` is sent yet

#### Scenario: Question left for ten minutes
- **WHEN** an `AskUserQuestion` request has waited ten minutes
- **THEN** it is still pending without `terminal`, and answering it from the app answers the hook

### Requirement: Request closed by the TUI
When Claude Code closes the hook request without the app's response, the daemon SHALL wait a short grace period (3 seconds). If the session moved on by then (a tool result or user message in the transcript, or a turn hook), the request SHALL be resolved as `cancelled`; otherwise it SHALL be handed over to the terminal like an expired one, because Claude Code's dialog may still be open.

#### Scenario: Approved on the Mac
- **WHEN** the user answers in the terminal and the transcript gets the tool result within the grace period
- **THEN** the clients receive `permission.resolved` with `cancelled` and never see the request handed over

#### Scenario: Hook closed while the dialog stays open
- **WHEN** Claude Code closes the hook (its own timeout) and nothing moves in the session for 3 seconds
- **THEN** the clients receive the request again with `terminal: true`

## ADDED Requirements

### Requirement: Handover to the terminal
A request handed over to the terminal SHALL stay in the daemon's pending list, replayed to clients that connect and counted as pending for its session (queued prompts and mode changes keep waiting). It SHALL end on the first of: a `tool_result` or `user` transcript entry of the session, a `UserPromptSubmit`, `Stop` or `SessionEnd` hook of the session, a new `PermissionRequest` of the session, or the session ending. When it ends, the clients receive `permission.resolved` with `expired` (daemon timeout) or `cancelled` (hook closed by Claude Code). `permission.respond` and `permission.answer` on a handed-over request MUST be rejected with `already_resolved`. Closing the session MUST NOT try to deny a handed-over request. Nothing SHALL be answered on the user's behalf.

#### Scenario: Answered in the terminal after the handover
- **WHEN** a question was handed over and the user answers it in the TUI
- **THEN** the transcript gets the tool result and the clients receive `permission.resolved` with `expired`

#### Scenario: Answering a handed-over request from an old app
- **WHEN** an app sends `permission.answer` for a handed-over request
- **THEN** it receives `already_resolved` and the hook is not answered

### Requirement: Question reminder
When an interactive request (question or plan) is still open `10` minutes after it was created, and its timeout is longer than that, the daemon SHALL send one reminder push for it, handed over or not.

#### Scenario: Unanswered question
- **WHEN** a question is still open after ten minutes
- **THEN** one reminder push is sent, and none after an answer
