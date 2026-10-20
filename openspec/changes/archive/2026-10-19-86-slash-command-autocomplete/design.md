## Context

- The daemon answers `commands.list` with project and profile skills/commands, plugin skills/commands (prefixed `plugin:`) and a hard-coded built-in table, de-duplicated by name (first source wins). Codex profiles get their own table.
- The app fetches the list once per session (TanStack Query) and filters it locally in `filterCommands(commands, query, limit = 20)`: prefix, substring, description, alphabetical, cut at 20.
- `SuggestionList` renders the rows in a `ScrollView` with `maxHeight: 220`, above the composer.

## Goals / Non-Goals

**Goals:** every command reachable from `/`; a ranking that puts what the user wants first; built-ins in sync with the CLI; pure, tested logic.

**Non-Goals:** a live source for built-ins; aliases; a protocol change.

## Decisions

- **Built-ins stay a curated table.** Options looked at:
  - The `system/init` message of `claude -p --output-format stream-json` lists `slash_commands`, but getting it means starting a real session: hooks fire (the daemon would register a phantom session), a transcript is written and a prompt is required.
  - The CLI is a single compiled binary with a minified bundle; the command objects (`name`, `description`, `isHidden`, `isEnabled`) can be grepped out of it, but the format is internal, changes every release and many entries are gated at runtime.
  - So the table is kept, refreshed against Claude Code 2.1.304, with the version in its comment and a test (no duplicates, `^[a-z][a-z0-9-]*$` names, non-empty descriptions). The app's `BUILTIN_KEYS` record is typed by the catalog, so a translation missing for a key fails typecheck; a missing key for a new daemon name falls back to the daemon's English text.
- **Which built-ins.** The ones a user can run from a phone and that exist without feature flags. Left out: `/logout` (would cut the session off), `/remote-control`, `/mobile`, `/desktop`, `/teleport` (other remotes), `/terminal-setup`, `/keybindings`, `/tui`, `/scroll-speed`, `/voice` (local terminal concerns), `/heapdump`, `/stickers` and internal or gated entries. `interactive: true` marks commands whose bare form opens a menu, picker or panel in the TUI (`/model`, `/config`, `/resume`, `/tasks`, `/diff`…).
- **Ranking is a pure function** (`features/autocomplete/ranking.ts`):
  - `matchCommand(item, query)` → `{ tier, indices, gaps } | null`: tier 0 name prefix, 1 name substring, 2 fuzzy subsequence on the name (case-insensitive, `indices` of the matched characters, `gaps` = characters skipped between them), 3 description substring (no name highlight).
  - `rankCommands(commands, query, recents)`: empty query → sections in a fixed order (`recent`, `builtin`, `project`, `profile`, `plugin`), each sorted by name, empty sections dropped; the *Recent* section holds up to 5 recent names that exist in the list, and those commands are not repeated below. With a query → one section (`results`) sorted by tier, then recent rank, then gaps, then name length, then name.
  - No new dependency: the subsequence matcher is a few lines and keeps the highlight indices exact.
- **Recents** (`features/autocomplete/recents.ts`, pure): `recordUse(list, name, now)` moves the name to the front, bumps its count and keeps at most 20; `recentNames(list, available, limit)` orders by last use. The store keeps `Record<profileId, CommandRecent[]>` in the secure store (`remote-harness.command-recents`), restored at app start like the other device preferences, and is cleared with "Forget the machine". A command is recorded when a prompt that starts with `/<name>` naming a listed command is sent from the app.
- **Rows and list.** A `SectionList` (virtualized, `keyboardShouldPersistTaps="always"`), section headers only with no query. Each row: `/name` with the matched characters in the accent text color, the description (one line), the source badge and, for interactive commands, a small terminal-window icon with an accessibility label. `minHeight: 44`. The list's max height is 40% of the window height above the keyboard, between 160 and 360 pt.

## Risks / Trade-offs

- The table drifts again with new CLI releases. The comment names the version it matches; the cost of a stale entry is an "Unknown command" reply from the CLI.
- A very long list (hundreds of plugin skills) renders in a virtualized list, so scrolling stays smooth; the ranking runs on every keystroke over the whole list, which is linear and cheap for that size.
