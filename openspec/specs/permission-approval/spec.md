# permission-approval Specification

## Purpose
Allows approving or denying the sessions' permission requests from the phone, including creating "always allow" rules.

## Requirements

### Requirement: Request brokering
On receiving `PermissionRequest`, the daemon SHALL create a request with a `requestId`, send `permission.request { requestId, sessionId, tool, input, suggestedRule, expiresAt }` to the clients and keep the hook request open until the response or the timeout.

#### Scenario: Approval
- **WHEN** the app replies `permission.respond` with `allow`
- **THEN** the hook receives `{"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":{"behavior":"allow"}}}` and the tool runs

#### Scenario: Denial
- **WHEN** the app replies `deny`
- **THEN** the hook receives `behavior: "deny"` with the message "Denied by Remote Harness"

### Requirement: Timeout without decision
If no response arrives before the configured limit (lower than the hook timeout), the daemon SHALL answer the hook without a decision and hand the request over to the terminal instead of resolving it. The limit SHALL be `questionTimeoutSec` (default 3300) for interactive requests (questions and plan approvals) and `permissionTimeoutSec` (default 280) for the others. The daemon MUST log the handover with the tool name only.

#### Scenario: Phone does not respond
- **WHEN** the timeout of a tool permission expires
- **THEN** the permission dialog stays in the TUI, the clients receive the request again with `terminal: true`, and no `permission.resolved` is sent yet

#### Scenario: Question left for ten minutes
- **WHEN** an `AskUserQuestion` request has waited ten minutes
- **THEN** it is still pending without `terminal`, and answering it from the app answers the hook

### Requirement: Single response
Only the first response for a `requestId` SHALL count; subsequent ones MUST receive `error` `already_resolved`.

#### Scenario: Two responses
- **WHEN** the app answers the same request twice
- **THEN** the second one receives `already_resolved`

### Requirement: Always allow
With `always { rule, scope }`, the daemon SHALL approve the request and persist the rule in `permissions.allow`: scope `profile` in the profile's `settings.json`; scope `project` in the `.claude/settings.local.json` of the session's `cwd`. The rest of the file MUST be preserved and the rule recorded in the daemon's log.

#### Scenario: Project rule
- **WHEN** the app approves with `always { rule: "Bash(pnpm test:*)", scope: "project" }`
- **THEN** the project's `.claude/settings.local.json` now contains the rule and the next `pnpm test` does not ask for permission

#### Scenario: Undo
- **WHEN** the user runs `remote-harness rules undo <id>`
- **THEN** the rule is removed from the file it was written to

### Requirement: Request closed by the TUI
When Claude Code closes the hook request without the app's response, the daemon SHALL wait a short grace period (3 seconds). If the session moved on by then (a tool result or user message in the transcript, or a turn hook), the request SHALL be resolved as `cancelled`; otherwise it SHALL be handed over to the terminal like an expired one, because Claude Code's dialog may still be open.

#### Scenario: Approved on the Mac
- **WHEN** the user answers in the terminal and the transcript gets the tool result within the grace period
- **THEN** the clients receive `permission.resolved` with `cancelled` and never see the request handed over

#### Scenario: Hook closed while the dialog stays open
- **WHEN** Claude Code closes the hook (its own timeout) and nothing moves in the session for 3 seconds
- **THEN** the clients receive the request again with `terminal: true`

### Requirement: Interactive tool requests
When the `PermissionRequest` tool is `AskUserQuestion` or `ExitPlanMode` and its input is well formed, the daemon SHALL include `interaction` in `permission.request`: for questions, the optional title and each question with its text, header, kind (`choice`, `text` or `number`), options (label and description) and `multiSelect`; for a plan, the plan text. Malformed input MUST produce no `interaction`.

#### Scenario: Multiple-choice question
- **WHEN** `AskUserQuestion` arrives with one question and three options
- **THEN** `permission.request` carries `interaction.kind: "question"` with the question and the three options

#### Scenario: Malformed input
- **WHEN** `AskUserQuestion` arrives without `questions`
- **THEN** `permission.request` has no `interaction`

### Requirement: Structured answers
The daemon SHALL accept `permission.answer` for a pending interactive request and answer the hook: a question answer becomes `allow` with `updatedInput` equal to the original input plus `answers` (question text → answer); a plan approval becomes `allow` with `updatedPermissions` `setMode` (`acceptEdits` or `default`, destination `session`); "keep planning" becomes `deny` with the user's feedback or a localized default message. An answer whose kind does not match the request, or `permission.respond` `allow` on an interactive request, MUST be rejected with `bad_request`.

#### Scenario: Question answered on the phone
- **WHEN** the app sends `permission.answer` with `{"Which database?": "Postgres"}`
- **THEN** the hook receives `behavior: "allow"` and `updatedInput.answers` with that answer, and clients receive `permission.resolved` `allowed`

#### Scenario: Keep planning
- **WHEN** the app sends a plan answer `keepPlanning` with the feedback "split step 2"
- **THEN** the hook receives `behavior: "deny"` with the message "split step 2"

#### Scenario: Answered in the terminal
- **WHEN** the user answers the question on the computer while the phone shows it
- **THEN** Claude Code closes the hook request and clients receive `permission.resolved` `cancelled`

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
