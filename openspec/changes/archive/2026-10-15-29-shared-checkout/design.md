## Context

Sessions carry a `cwd` (from hooks, transcripts or the persisted links). Git is only called from `infra/`. The launcher passes its arguments to `claude`, and Claude Code (2.1+) has `-w, --worktree [name]`, which creates a git worktree under `<repo>/.claude/worktrees/<name>` on a new branch and runs the session there; on exit it asks whether to keep or remove the worktree.

## Goals / Non-Goals

**Goals:** make a shared checkout visible before and while it happens; one tap to start isolated.

**Non-Goals:** blocking sessions, merging worktrees back, cleaning worktrees from the app (Claude Code already asks on exit; `claude rm` removes background sessions and their worktrees when safe), detecting editors or other non-Claude processes in the checkout.

## Decisions

- **Checkout = worktree root + branch.** `git rev-parse --show-toplevel` gives the root of the worktree the directory belongs to, so two worktrees of the same repository are different checkouts (that is the point). Branch from `git symbolic-ref --short -q HEAD` (works in a repository without commits; `null` when detached). Both calls go through `GitClient` in `infra/git.ts` with a short timeout; any failure means "not a git checkout" (`null`).
- **Resolution in the daemon, cached.** A `checkout` feature listens to the session store: on a new session, a changed `cwd`, or a turn starting (`running`, the branch may have changed), it resolves the checkout (cache by `cwd`, 15 s) and patches `checkout` when it differs. The store ignores no-op patches, so the listener does not loop. Read-only sessions from the transcript scan are resolved too (one cached call per directory).
- **Wire shape.** `SessionSchema.checkout: { root, branch } | null`, default `null`, so older daemons and apps keep working (unknown keys are stripped by Zod).
- **Live peers, one pure helper.** `checkoutPeers(session, sessions)` in `@claude-remote/protocol` returns the other live sessions (`controllable` and not `ended`) with the same `checkout.root`. The daemon uses it for `checkout.inspect` and the app for the list badge, so both agree.
- **`checkout.inspect { profileId, cwd }` → `checkout.info { checkout, peers }`.** Validates `cwd` like `session.start` (`invalid_cwd`), resolves it without the cache and returns the live sessions already in that checkout (ids and titles). An older daemon answers with an error; the app then hides the warning and the worktree option, so `worktree: true` is never sent to a daemon that would silently ignore it.
- **Worktree start.** `session.start { worktree: true }` requires a git checkout (`bad_request` otherwise) and runs the launcher with `--worktree remote-<yyyymmdd-hhmmss>` (pure `worktreeName(date)`, valid as a branch and directory name). The session reports its real `cwd` (inside `.claude/worktrees`) through the hooks, so it gets its own checkout and no warning.
- **App.** The new-session screen inspects the typed/selected directory (debounced). For a git directory it shows the branch and a "Isolated copy (git worktree)" switch; when the checkout has live sessions it shows them in a warning and the start button asks for confirmation unless the switch is on. The session row shows the branch next to the path and a warning badge "Same checkout as N" for live sessions with peers.

## Risks / Trade-offs

- Claude Code older than `--worktree` fails in the tmux window right after start → the README states the minimum; the session simply never reports `SessionStart`.
- A branch switched by hand while the session is idle is only noticed on the next turn or `sessions.list` → acceptable for a hint.
- `.claude/worktrees/` lives inside the repository → Claude Code ignores it from git status by itself; nothing for the daemon to write.
