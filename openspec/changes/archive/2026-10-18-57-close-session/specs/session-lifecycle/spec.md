## ADDED Requirements

### Requirement: Close session
`session.close { sessionId, worktree? }` SHALL end a controllable session gracefully: the daemon denies the session's pending permission requests, sends Escape, types `/exit` and Enter in its pane, and waits up to 10 seconds for the session to be `ended` or its pane to disappear. If the pane is still there after that, the daemon SHALL kill it, but only when the registry still maps that pane to this session. The session MUST end as read-only (`ended`, no pane), its transcript MUST be kept and it MUST remain resumable. The reply is an `ack` whose data says how it ended (`exited`, `killed` or `already`) and, when a worktree action was requested, its outcome. A read-only session MUST produce `error` `not_controllable`.

#### Scenario: Idle session
- **WHEN** the app closes an idle session and Claude Code exits on `/exit`
- **THEN** the session becomes `ended` within the timeout and the ack says `exited`

#### Scenario: Session that ignores /exit
- **WHEN** the session has not ended 10 seconds after `/exit`
- **THEN** the daemon kills its pane, marks it `ended` and the ack says `killed`

#### Scenario: Waiting session
- **WHEN** the session waits for a permission when it is closed
- **THEN** the pending request is denied first, so the agent is not left blocked in the hook

#### Scenario: Pane reused by another session
- **WHEN** the pane was taken over by a new session id before the timeout elapsed
- **THEN** the daemon does not kill it and reports the old session as `already` ended

### Requirement: Worktree cleanup
`worktree.inspect { sessionId }` SHALL reply `worktree.info { worktree }`, where `worktree` is `null` unless the session's folder is inside a linked git worktree (never the repository's main checkout), and otherwise carries its `path`, `branch`, `mainRoot`, the number of modified or untracked files (`dirty`) and the number of commits reachable from HEAD and from no remote ref (`unpushed`). `worktree.cleanup { sessionId, action }` and the `worktree` option of `session.close` SHALL apply one action: `delete` only when the worktree is clean and pushed (otherwise `error` `bad_request`); `push-delete` commits any changes ("WIP from Remote Harness"), pushes the branch to `origin` creating the upstream when missing, then deletes; `discard-delete` removes the worktree and its branch without pushing. After a successful push or on a clean worktree the daemon removes the worktree with git and deletes the local branch when it is merged. A failed push MUST keep the worktree and report `error` `internal` with git's message. Git MUST be called only from `infra/`.

#### Scenario: Clean worktree
- **WHEN** the app closes a session whose worktree has no changes and no unpushed commits with `worktree: "delete"`
- **THEN** the session ends and the worktree and its merged branch are removed

#### Scenario: Unpushed commits
- **WHEN** the worktree has 3 commits not on any remote and the user chooses push-delete
- **THEN** the daemon pushes the branch (creating the upstream) and then removes the worktree

#### Scenario: Push fails
- **WHEN** the push is rejected
- **THEN** the worktree stays, the branch stays, and the app shows git's error

#### Scenario: Main checkout
- **WHEN** the session runs in the repository's main checkout
- **THEN** `worktree.inspect` replies `null` and no cleanup is offered
