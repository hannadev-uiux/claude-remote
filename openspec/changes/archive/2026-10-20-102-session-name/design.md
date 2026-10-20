## Context

`LifecycleService.start` runs the profile launcher with extra CLI arguments. The launcher passes them to tmux, quoting each one with zsh's `${(q)…}`, so any text is safe as one argument. The session registers when its pane's `SessionStart` hook arrives, which can be after `session.started` (`sessionId: null`). Titles start as `basename(cwd)`. `SessionStart` reads the transcript summary (custom title), and `UserPromptSubmit` replaces only a title still equal to the folder name.

Claude Code 2.1 accepts `-n, --name <name>`, "Set a display name for this session". `--worktree <name>` creates `<repo root>/.claude/worktrees/<name>` on branch `worktree-<name>`.

## Decisions

- **Validation in the protocol.** `SessionNameSchema = z.string().trim().min(1).max(80)` with no control characters (`\u0000`–`\u001f`, `\u007f`). Both sides use it, so a newline or a tab is rejected as `bad_request`. The app first collapses whitespace with `cleanSessionName`, so typing never hits the error.
- **The title comes from the daemon, not only from Claude Code.** Claude Code may write its `custom-title` late, and Codex has no name at all. The daemon applies the name itself:
  - When `start` already returns the session id, it upserts the title at once.
  - Otherwise it keeps `pendingNames[paneId]`. A store listener applies the name to the first session that links to that pane, then forgets the entry.
- **Worktree name.** Pure `worktreeSlug(name)`:
  - folds accents (NFD), lowercases, and turns runs of anything outside `[a-z0-9]` into `-`;
  - trims `-` and cuts at 40 characters on a word boundary.

  `worktreeCandidates(slug)` yields `slug`, `slug-2` … `slug-9`. The service picks the first one whose directory and branch are both free (`isDirectory` and `GitClient.hasBranch`, injected), else `worktreeName(now)`.
- **Suggestions.** Pure `nameSuggestions(branch, sessions, cwd)` returns:
  - the branch, unless it is a default branch (`main`, `master`, `develop`, `development`, `trunk`);
  - the titles of the last three sessions in that directory, leaving out the folder name and duplicates.

## Risks / Trade-offs

- [An older daemon ignores `name`] → The session starts with the folder title, as before.
- [Name equal to the folder name] → The first prompt can still replace it, as the rule only checks the folder name. This edge case is accepted.
