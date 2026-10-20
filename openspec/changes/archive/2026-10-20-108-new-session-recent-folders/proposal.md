## Why

On the New session screen the Recent list is fully expanded under the Directory field (issue #221). With many recent folders, and every worktree under `.claude/worktrees/…` counting as a separate one, the `Start session` button ends up far below the fold and the user has to scroll a lot to find it. The Directory field also has no Done key: after typing a path the user has to tap somewhere else to close the keyboard before seeing `Start session`.

## What Changes

- **Recent, collapsed:** the screen shows at most three recent rows inline. Worktrees under `<repo>/.claude/worktrees/<name>` are folded into their repository's row, which says how many worktrees it has ("3 worktrees"). When anything is left out, a "See all recent (N)" row opens a sheet with every recent folder (worktrees included, one row each) and a search box.
- **Tapping a recent folder** fills the Directory field and closes the keyboard.
- **Done key:** the Directory field shows the keyboard's Done key, which closes the keyboard.
- **Sticky Start:** `Start session` (with the starting indicator) moves to a footer under the scrolling form, kept right above the keyboard while it is open, so it is visible without scrolling however long the form is.

## Capabilities

### New Capabilities

### Modified Capabilities
- `session-lifecycle`: New session screen layout (collapsed Recent with worktrees grouped, full recent sheet, Done key, sticky Start)

## Impact

- `apps/mobile/src/features/lifecycle`:
  - `recent.ts` (`worktreeRoot`, `groupRecent`, `filterRecent`, tested);
  - `new-session.ts` (`recentDetail` with the worktree count);
  - `RecentFoldersSheet.tsx` (new);
  - `NewSessionScreen.tsx` (collapsed list, Done key, footer in a `KeyboardAvoidingView`).
- i18n in pt-BR, en-US and es-ES. JavaScript only, no new build needed.
