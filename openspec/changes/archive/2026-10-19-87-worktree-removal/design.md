## Context

- `GitClient.removeWorktree` runs `git -C <main> worktree remove [--force] <path>`, then `worktree prune` and `branch -d|-D`. Each call goes through the executor, which uses execa with `timeout` (5 s for git) and `reject: false`. A timed-out git process is killed with no stderr, and `exitCode` is undefined, so it maps to 1.
- `git worktree remove` checks the worktree (no changes in tracked files, no untracked files that are not ignored, not locked). It then deletes the folder recursively, ignored files included, in directory order. Killing it leaves whatever had not been reached yet.
- Claude Code's `--worktree` locks the worktree with the reason `claude session <name> (pid <pid> start <date>)`. The lock is still there after the session ends.
- `CloseService.close` inspects the worktree before the agent exits, ends the session, then cleans up. A failure after the end comes back to the app as an `error`, while the session is already `ended`.

## Goals / Non-Goals

**Goals:** removal that either completes or leaves the worktree untouched; no time limit on the deletion itself; locks handled; the real reason reaches the app and the log; Retry from the app.

**Non-Goals:** macOS privacy (TCC) prompts. If the daemon cannot touch the folder, the move fails with `EPERM` and the message says so, with nothing deleted. Also a non-goal: recovering worktrees that the old code already half-deleted. Their missing tracked files count as changes, so "Discard changes and delete" removes them.

## Decisions

- **Move, then delete.** `removeWorktree(info, { force })`:
  1. Lock: `git worktree list --porcelain` from the main checkout, parsed by a pure `parseWorktreeList`. The entry is matched by real path. When it is locked, a pure `lockPid(reason)` reads `pid <n>` from the reason. If that process is alive (`process.kill(pid, 0)`), the cleanup stops: "the worktree is locked by a running process (pid N): <reason>". Otherwise the daemon runs `git worktree unlock <path>`.
  2. Move: `rename(<path>, <git-common-dir>/remote-harness-trash/<name>-<timestamp>)`. The common dir comes from `git rev-parse --path-format=absolute --git-common-dir`. A rename on the same filesystem is atomic, and the git dir is never shown by `git status`.
     - When the rename fails with `EXDEV` (worktree on another filesystem), the daemon falls back to `git worktree remove [--force]` with a 10-minute timeout.
     - Any other rename error stops the cleanup with "could not move the worktree folder: <message>". Nothing has been deleted at that point.
  3. `git worktree prune` (the entry's folder is gone, so git drops it), then `branch -d` (or `-D` when forced). The result of the branch deletion is ignored, as before: an unmerged branch stays, so nothing is lost.
  4. Background `rm -r` of the trash folder (`fs.rm`, `force`, `maxRetries`). It also sweeps leftovers from earlier runs. Failures are logged through an optional callback and never fail the request.

  The fs calls and the liveness check are injected into `GitClient` (defaults: `node:fs/promises`, `process.kill`), so unit tests can fake them. A test runs the whole flow against a real repository.
- **Safety stays in the feature.** `cleanupPlan` keeps its rules. For a non-forced plan, `CloseService.cleanupWorktree` calls `worktreeInfo` again after any commit/push and right before `removeWorktree`. If `dirty` or `unpushed` is above 0, it throws `bad_request` with the counts. This replaces the check that `git worktree remove` did by itself.
- **Errors.** `ExecResult` gains `timedOut?: boolean`. `GitClient.must` throws with git's stderr, otherwise `git <subcommand> timed out after <s> s`, otherwise `git <subcommand> exited with code <n>`. `CloseService` logs failures (`warn`, with path, action and message) through an injected logger, and still rejects with `internal` and the message.
- **App failure state.** On a failed request where a worktree action was chosen, `CloseSessionSheet` shows the message in a danger box with Retry and "Keep the worktree":
  - It reads the session from the live store. If the session is no longer controllable (the close went through and only the worktree step failed), Retry sends `worktree.cleanup` with the same action. Otherwise Retry repeats `session.close`.
  - "Keep the worktree" closes the sheet.

## Risks / Trade-offs

- The trash folder takes disk space until the background delete ends. A daemon restart in the middle leaves it in the git dir, and the next cleanup in that repository sweeps it.
- The liveness check can be fooled by pid reuse: a stale lock whose pid now belongs to another process blocks the cleanup. The message names the pid, so the user can unlock it by hand. That is the safe direction.
- Skipping `git worktree remove` means git's own checks don't run. The re-inspection covers the same ground: modified, deleted and untracked non-ignored files through `status --porcelain`, and unpushed commits. Submodules move with the folder.
