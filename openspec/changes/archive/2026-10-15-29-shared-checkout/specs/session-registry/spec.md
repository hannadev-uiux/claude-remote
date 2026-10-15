## ADDED Requirements

### Requirement: Session checkout
Each session SHALL carry `checkout: { root, branch } | null`: the root of the git worktree that contains its `cwd` and the current branch (`null` when detached), or `null` when the `cwd` is not inside a git checkout or no longer exists. The daemon SHALL resolve it when a session appears, when its `cwd` changes and when a turn starts, and SHALL broadcast `session.updated` only when it changes. Git MUST be called only from `infra/`.

#### Scenario: Session in a repository
- **WHEN** a session reports `cwd` `~/work/api/src` and `~/work/api` is a git repository on `main`
- **THEN** the session has `checkout` `{ root: "~/work/api", branch: "main" }` (absolute paths)

#### Scenario: Worktree of the same repository
- **WHEN** another session runs in `~/work/api/.claude/worktrees/remote-1`
- **THEN** its `checkout.root` is the worktree directory, different from the main checkout

#### Scenario: Not a repository
- **WHEN** the `cwd` is not inside a git checkout
- **THEN** `checkout` is `null`
