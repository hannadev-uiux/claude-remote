## MODIFIED Requirements

### Requirement: Worktree cleanup
`worktree.inspect { sessionId }` SHALL reply `worktree.info { worktree }`, where `worktree` is `null` unless the session's folder is inside a linked git worktree (never the repository's main checkout), and otherwise carries its `path`, `branch`, `mainRoot`, the number of modified or untracked files that are not ignored (`dirty`) and the number of commits reachable from HEAD and from no remote ref (`unpushed`). `worktree.cleanup { sessionId, action }` and the `worktree` option of `session.close` SHALL apply one action: `delete` only when the worktree is clean and pushed (otherwise `error` `bad_request`); `push-delete` commits any changes ("WIP from Remote Harness"), pushes the branch to `origin` creating the upstream when missing, then deletes; `discard-delete` removes the worktree and its branch without pushing. Before a removal that is not `discard-delete`, the daemon MUST inspect the worktree again and stop with `bad_request` if it has changes or unpushed commits. The removal MUST either complete or leave the worktree untouched: the daemon removes a stale lock (one whose process is not running, such as Claude Code's `claude session … (pid N …)` lock after the session ended), moves the whole folder out of place in one step, prunes the worktree entry, deletes the local branch when it is merged, and deletes the moved folder in the background with no time limit. Ignored files (such as `node_modules`) MUST NOT block a clean removal. Before cleaning up, the daemon SHALL wait up to 6 seconds for the process holding the worktree's lock (the agent leaving) to exit; when closing the session, if it is still running and the session's pane still exists (Claude Code's own "keep or remove the worktree?" dialog after `/exit`), the daemon SHALL end that pane and wait again. A worktree whose folder is already gone (Claude Code removes a clean worktree itself when it exits) SHALL count as removed after pruning its entry and deleting its merged branch. A lock still held by a running process MUST keep the worktree and report `error` `session_busy`, which the app shows as a translated message (the agent is still using the worktree; retry or keep it). A failed move or a failed push MUST keep the worktree and its branch and report `error` `internal` with the real reason (git's message, a timeout, an exit code or the file system error); every failure is also logged with the worktree path. Git MUST be called only from `infra/`.

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

#### Scenario: Large ignored folders
- **WHEN** a clean, merged worktree holds a `node_modules` folder that takes a minute to delete
- **THEN** the cleanup succeeds at once, the worktree is gone from `git worktree list`, the branch is deleted and the folder is deleted in the background

#### Scenario: Stale Claude Code lock
- **WHEN** the worktree is locked with `claude session remote-1 (pid 4242 start …)` and process 4242 is not running
- **THEN** the daemon unlocks and removes it

#### Scenario: Locked by a running process
- **WHEN** the lock names a process that is still running after the wait
- **THEN** nothing is removed and the daemon replies `session_busy` naming the process, which the app shows as "the agent is still using the worktree"

#### Scenario: Agent still in its exit dialog
- **WHEN** a session in a worktree with changes is closed with `push-delete`, and Claude Code stays in its "keep or remove the worktree?" dialog holding the lock
- **THEN** the daemon ends the pane, the lock's process exits, and the worktree is pushed and removed

#### Scenario: Agent removed the worktree itself
- **WHEN** Claude Code removed the clean worktree when it exited
- **THEN** the daemon prunes the entry, deletes the merged branch and reports the worktree deleted

#### Scenario: Move fails
- **WHEN** the worktree folder cannot be moved (for example "Operation not permitted")
- **THEN** every file of the worktree is still in place and the error carries the file system message

#### Scenario: Untracked file
- **WHEN** the worktree has one untracked file that is not ignored and the action is `delete`
- **THEN** the daemon replies `bad_request` and keeps the worktree
