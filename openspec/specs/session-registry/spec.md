# session-registry Specification

## Purpose
Maintains the unified list of Claude Code sessions across all profiles, with their state and whether they can be controlled.

## Requirements

### Requirement: Unified listing
The daemon SHALL answer `sessions.list` with all active sessions (linked to a live tmux pane) and recent ones (transcripts modified in the last 7 days) from all profiles, each with `id`, `profileId`, `cwd`, `title`, `state`, `permissionMode`, `controllable`, `updatedAt`.

#### Scenario: Two profiles
- **WHEN** there is an active session in `claudin` and another in `drclaude`
- **THEN** the snapshot contains both, each with its own `profileId`

#### Scenario: Disk-only session
- **WHEN** a recent transcript has no linked tmux pane
- **THEN** the session appears with `controllable: false` and state `ended`

### Requirement: Event-driven state
The daemon SHALL update the session state from the hooks: `SessionStart` → `idle`; `UserPromptSubmit` → `running`; `Stop` → `idle`; `Notification`/`PermissionRequest` → `waiting`; `SessionEnd` → `ended`. Each change MUST be sent to clients as `session.updated`.

#### Scenario: Permission request
- **WHEN** a `Notification` of type `permission_prompt` arrives
- **THEN** the session becomes `waiting` and clients receive `session.updated`

### Requirement: Dead pane
The daemon SHALL periodically check (every 5 s) whether the linked panes exist and MUST mark sessions whose pane is gone as `ended` and `controllable: false`.

#### Scenario: tmux window closed
- **WHEN** the user closes the session's window on the Mac
- **THEN** within 5 s the session appears as ended in the app

### Requirement: Link persistence
The session ↔ pane ↔ profile link SHALL be persisted with the session's `updatedAt` and restored when the daemon starts, discarding panes that no longer exist. A restored session SHALL keep its persisted `updatedAt`; when the state file predates the field, the transcript's modification time is used, and only without a transcript the restore time.

#### Scenario: Daemon restart
- **WHEN** the daemon restarts with a session still open in tmux
- **THEN** the session appears as controllable again

#### Scenario: Restart does not reorder
- **WHEN** two sessions with different `updatedAt` are restored after a restart
- **THEN** both keep their `updatedAt` and their relative order

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

### Requirement: Last activity
A session's `updatedAt` SHALL mean its last real activity: a hook event (prompt, stop, permission, notification, session start or end, subagent stop) or new transcript entries read by the daemon for the session or one of its subagents. Transcript activity SHALL advance `updatedAt` at most once every 5 seconds per session. Metadata refreshes (status line, checkout) MUST NOT advance it. A patch that only carries a newer `updatedAt` SHALL count as a change and be broadcast as `session.updated`.

#### Scenario: Streaming output
- **WHEN** a followed session appends transcript lines continuously for 12 seconds
- **THEN** its `updatedAt` advances at most three times and each advance is broadcast

#### Scenario: Status tick
- **WHEN** only the session's status line changes
- **THEN** `updatedAt` is unchanged
