## Why

The `/` autocomplete misses native Claude Code commands and hides most of the list (issue #92). The daemon's built-in table (23 entries) is out of date with the CLI: `/rename`, `/add-dir`, `/tasks`, `/btw`, `/diff`, `/skills` and others never show up, and a few entries no longer exist (`/review`, `/agents`) or are now aliases (`/cost` → `/usage`). In the app, `filterCommands` cuts the result at 20 items, so typing only `/` shows the first 20 names in alphabetical order and the user cannot discover the rest (built-ins + project and profile commands + skills + plugin commands). Matching is substring-only, with no ranking by what the user actually uses.

## What Changes

- **Built-in table brought up to date** with Claude Code 2.1.304 (name, English description, `interactive`), with a daemon test that fails on duplicates, invalid names or empty descriptions. Commands that end the remote control of the session or make no sense from a phone (`/logout`, `/remote-control`, `/terminal-setup`, `/keybindings`, `/voice`…) stay out. Every built-in has a translated description in the app (pt-BR, en-US, es-ES).
- **All commands for `/`**: with no query the app lists every command in a scrollable list grouped in sections: *Recent*, *Built-in*, *Project*, *Profile*, *Plugins*. No 20-item cut.
- **Fuzzy search**: typing filters by name prefix first, then name substring, then fuzzy (subsequence) match on the name, then description. Matched characters of the name are highlighted.
- **Recent commands first**: the commands sent from the app are remembered per profile on the device (name, last use, count). They lead the list with no query and win ties when filtering.
- **Rows**: name (with highlights), short description, source badge and an icon for commands that open an interactive menu (the app switches to the raw terminal after sending them). Rows have a 44 pt tap target; the list height follows the space left above the keyboard; the empty state reads "no commands match".

## Non-goals

- Reading the command list from the installed CLI. Investigated and left out (see design): every source either starts a real Claude Code session or parses the minified CLI bundle.
- Command aliases (`/cost`, `/stats`) as separate rows.

## Capabilities

### Modified Capabilities
- `autocomplete`: command list (up-to-date built-ins), suggestions in the app (sections, fuzzy ranking, recents, rows), interactive commands (list of interactive built-ins).

## Impact

`apps/daemon` (`builtin-commands.ts` + test), `apps/mobile` (pure ranking and recents logic with tests, recents store on the device, `SuggestionList` with sections and highlights, `describe-command`, i18n in three catalogs). No protocol change; works over the air with any daemon (older daemons send their older table).
