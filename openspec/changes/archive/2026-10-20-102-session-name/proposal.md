## Why

A session started from the app takes its title from the folder name, then from the first prompt or the transcript (issue #164). The user cannot name it up front, so the list shows "acme-api" or a long first sentence until something better arrives, and the only way to rename it is `/rename` in the terminal.

## What Changes

- **Protocol:** `session.start` gains an optional `name`: trimmed, one line, no control characters, at most 80 characters (`SessionNameSchema`).
- **Daemon:**
  - **Agent flag:** the agent adapter gains `nameArgs(name)`. For Claude Code it returns `--name <name>`, which shows the name in the prompt box, `/resume` and the terminal title, and writes a `custom-title` entry to the transcript. Codex has no such flag, so it returns `null`.
  - **Title right away:** with or without the flag, the daemon sets the session title to the name as soon as the session registers. It does this even when the registration comes after `session.started`.
  - **Name wins over the first prompt:** the existing precedence is kept, and the first prompt still replaces only a title equal to the folder name.
- **Worktree:** when the isolated copy is on and a name is given, the worktree and branch name is the name's slug (`rate-limit-on-login`), not `remote-<timestamp>`.
  - **Collisions:** if `.claude/worktrees/<slug>` or the branch `worktree-<slug>` already exists, the daemon adds `-2`, `-3` and so on, up to `-9`.
  - **Fallback:** when the slug is empty, or every candidate is taken, the timestamp name is used.
- **App:**
  - **Name field:** the New session screen has an optional "Name" field under the directory.
  - **Suggestions:** below the field, chips offer the directory's branch and up to three recent session names in that folder. Tapping a chip fills the field.
  - **Sending:** the cleaned name is sent only when it is not empty.
- **Unchanged:** resume keeps the existing name. Without a name, everything works as before.

## Capabilities

### New Capabilities

### Modified Capabilities
- `session-lifecycle`: session name at start, worktree name from the session name, name field on the New session screen

## Impact

- `packages/protocol`: `SessionNameSchema`, `SESSION_NAME_MAX`, `session.start.name`
- `apps/daemon`:
  - `features/agents` (`nameArgs`);
  - `features/checkout/resolver.ts` (`worktreeSlug`, `worktreeCandidates`);
  - `features/lifecycle` (name args, pending title per pane, free worktree name);
  - `infra/git.ts` (`hasBranch`).
- `apps/mobile/src/features/lifecycle`: pure `cleanSessionName` and `nameSuggestions` (tests), name field and chips; i18n.
- An older daemon ignores `name`: the session is still created and keeps the folder title.
