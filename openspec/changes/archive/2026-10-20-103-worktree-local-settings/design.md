## Context

When creating a worktree, Claude Code 2.1.304 (`sot` in its bundle) calls a settings copy. That copy is skipped when the worktree's `localSettings` path resolves to another directory: the canonical repo root, used once the ownership of the root, `.git` and `.claude` is verified. It then copies the git-ignored files matched by `.worktreeinclude`, which `git ls-files --others --ignored --exclude-standard` lists. The daemon starts worktree sessions with `--worktree <name>`, so the session's directory is `<root>/.claude/worktrees/<name>`.

`PermissionBroker.ruleFile` logs project rules at `join(cwd, '.claude', 'settings.local.json')`.

## Decisions

- **No copy in the daemon.** Claude Code owns the worktree's creation and its settings store. A second copy would either duplicate its work or create the stale overlay it avoids on purpose.
- **Inspection only.** `checkout.inspect` reads `<root>/.claude/settings.local.json` (existence) and `<root>/.worktreeinclude`. Pure `parseWorktreeInclude` keeps the non-empty, non-comment lines, trimmed, at most 12. A missing or unreadable file gives `[]`. `worktreeCopy` is optional, so older apps ignore it, and older daemons do not send it (the app shows no note).
- **Pure `localSettingsRoot(cwd)`.** It returns `<root>` when `cwd` is exactly `<root>/.claude/worktrees/<name>`, else `cwd`. The broker uses it for project-scope rule files.
  - A session in a subdirectory of a worktree keeps today's path. Claude Code's project directory is the session's starting directory, and the daemon only starts worktree sessions at the worktree root.
  - If Claude Code falls back to the worktree's own file (ownership check failed), `rules undo` misses the rule, the same as before this change.
- **App note.** Pure `worktreeCarryOver(copy, t)` returns the lines to show:
  - "Local permissions" when `localSettings` is true;
  - then the include entries;
  - or a hint when there are none.

## Risks / Trade-offs

- [Older Claude Code versions that neither resolve to the canonical root nor copy] → The note can promise more than such a version does. The docs name the version checked.
