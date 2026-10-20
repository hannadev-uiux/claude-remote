## ADDED Requirements

### Requirement: Worktree cleanup failure
When the worktree step of closing a session (or of cleaning up an ended session's worktree) fails, the close sheet SHALL stay open and show the daemon's message with two actions: **Retry** and **Keep the worktree**. Retry SHALL repeat only the worktree cleanup with the same action when the session already ended, and the whole close otherwise. Keep the worktree SHALL close the sheet without further requests. Texts MUST be translated.

#### Scenario: Close went through, removal failed
- **WHEN** the user closes a session with "Close and delete the worktree" and the session ends but the removal fails with "the worktree is locked by a running process (pid 4242)"
- **THEN** the sheet shows that message with Retry and Keep the worktree, and Retry sends `worktree.cleanup` with `delete`

#### Scenario: Keep
- **WHEN** the user taps Keep the worktree after a failure
- **THEN** the sheet closes and the worktree stays
