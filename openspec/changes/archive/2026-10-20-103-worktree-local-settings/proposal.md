## Why

Issue #139 asks that sessions started in a git worktree inherit the project's local settings, mainly the permissions approved in `.claude/settings.local.json`. Otherwise the worktree session asks for everything again.

Claude Code 2.1.304 (checked in its bundle) already covers the core of this when it creates a worktree with `--worktree`:

- It resolves a worktree's `localSettings` to the main checkout's `.claude/settings.local.json` (the "canonical repo root"). The worktree session reads the approved rules, and rules approved in it are written there. It deliberately does not copy the file in that case, because a stale copy would bring back rules revoked later.
- When that resolution does not apply, it copies `.claude/settings.local.json` into the new worktree.
- It copies the git-ignored files listed in the project's `.worktreeinclude` (gitignore syntax; symlinks and paths escaping the worktree are skipped).

A copy made by the daemon would duplicate this and reintroduce the stale-overlay problem Claude Code avoids. What is missing is visibility and consistency on our side:

- the app does not say what a new worktree session inherits;
- the daemon logs "always allow" rules approved in a worktree session against the worktree's own `settings.local.json`, while Claude Code writes them to the main checkout's file, so `remote-harness rules undo` looks in the wrong file.

## What Changes

- **Daemon, `checkout.info`:** gains `worktreeCopy: { localSettings, include }`. It says whether the checkout has `.claude/settings.local.json` and lists the entries of its `.worktreeinclude` (comments and blank lines dropped, at most 12).
- **App, worktree toggle:** under the toggle, a short note says what the isolated copy inherits:
  - "Local permissions (.claude/settings.local.json)" and the `.worktreeinclude` entries;
  - or, when there is no `.worktreeinclude`, a hint to list git-ignored files such as `.env` there.
- **Daemon, rules log:** an "always allow" rule with project scope, approved in a session whose directory is a Claude Code worktree (`<root>/.claude/worktrees/<name>`), is logged against `<root>/.claude/settings.local.json`, where Claude Code writes it. `rules undo` then finds it.
- **Docs (pt-BR, en-US, es-ES):** explain the inheritance and `.worktreeinclude`.
- **Not done:**
  - no files are copied by the daemon;
  - no merge-back on cleanup is needed, because the rules already live in the main checkout's file.

## Capabilities

### New Capabilities

### Modified Capabilities
- `session-lifecycle`: what an isolated copy inherits, shown before starting
- `permission-approval`: rule file of project rules approved in a worktree session

## Impact

- `packages/protocol`: `WorktreeCopySchema`, `checkout.info.worktreeCopy`
- `apps/daemon`: `features/checkout` (`parseWorktreeInclude`, inspection), `features/permissions/broker.ts` (`localSettingsRoot`)
- `apps/mobile/src/features/lifecycle`: `worktreeCarryOver` (tested), note under the toggle; i18n
- `apps/web/content/*/using-the-app.md`
