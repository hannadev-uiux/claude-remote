## Purpose

Allows approving or denying the sessions' permission requests from the phone, including creating "always allow" rules.

## ADDED Requirements

### Requirement: Request brokering
On receiving `PermissionRequest`, the daemon SHALL create a request with a `requestId`, send `permission.request { requestId, sessionId, tool, input, suggestedRule, expiresAt }` to the clients and keep the hook request open until the response or the timeout.

#### Scenario: Approval
- **WHEN** the app replies `permission.respond` with `allow`
- **THEN** the hook receives `{"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":{"behavior":"allow"}}}` and the tool runs

#### Scenario: Denial
- **WHEN** the app replies `deny`
- **THEN** the hook receives `behavior: "deny"` with the message "Denied by Claude Remote"

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
- **WHEN** the user runs `claude-remote rules undo <id>`
- **THEN** the rule is removed from the file it was written to

### Requirement: Request closed by the TUI
If the session continues without the app's response (answered on the Mac), the request SHALL be marked as resolved for the clients.

#### Scenario: Approved on the Mac
- **WHEN** the hook request is cancelled by Claude Code
- **THEN** the clients receive `permission.resolved` with `cancelled`
