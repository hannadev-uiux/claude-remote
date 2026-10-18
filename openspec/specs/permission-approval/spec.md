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
If no response arrives before the configured limit (lower than the hook timeout), the daemon SHALL answer the hook without a decision, and the request MUST be marked as expired for the clients.

#### Scenario: Phone does not respond
- **WHEN** the timeout expires
- **THEN** the permission dialog appears normally in the Mac's TUI and the app receives `permission.resolved` with `expired`

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
If the session continues without the app's response (answered on the Mac), the request SHALL be marked as resolved for the clients.

#### Scenario: Approved on the Mac
- **WHEN** the hook request is cancelled by Claude Code
- **THEN** the clients receive `permission.resolved` with `cancelled`

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
