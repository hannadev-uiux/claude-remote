## ADDED Requirements

### Requirement: Close and worktree messages
The protocol SHALL define the client messages `session.close { sessionId, worktree? }` (answered with `ack` carrying `{ closed: 'exited' | 'killed' | 'already', worktree?: 'deleted' | 'kept' }`), `worktree.inspect { sessionId }` (answered with `worktree.info { worktree: WorktreeInfo | null }`) and `worktree.cleanup { sessionId, action }` (answered with `ack`). `WorktreeInfo` SHALL carry `path`, `branch` (nullable), `mainRoot`, `dirty` and `unpushed` (non-negative integers). `action` and the `worktree` option SHALL be one of `delete`, `push-delete`, `discard-delete`.

#### Scenario: Close with cleanup
- **WHEN** the client sends `session.close` with `worktree: "push-delete"`
- **THEN** the message parses

#### Scenario: Unknown action
- **WHEN** the client sends `worktree.cleanup` with `action: "wipe"`
- **THEN** the parser returns a `bad_request` error
