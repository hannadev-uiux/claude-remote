## ADDED Requirements

### Requirement: Agent mode on sessions
`Session` SHALL carry `approvalPolicy`: the Codex approval policy of the session (`on-request`, `never`, `untrusted`, `granular`, or another value Codex reports), `null` for Claude Code sessions and until known. It MUST default to `null` so messages from older daemons stay valid. `permissionMode` keeps describing Claude Code sessions.

#### Scenario: Older daemon
- **WHEN** an app parses a session without `approvalPolicy`
- **THEN** it reads `approvalPolicy: null`
