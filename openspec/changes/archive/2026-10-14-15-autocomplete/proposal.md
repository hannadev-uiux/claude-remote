## Why

Typing paths and skill names on the phone is slow and error-prone; the TUI autocomplete doesn't work because the text is pasted (D15, D16, A13, A14, A15).

## What Changes

- Daemon: `files.search` with an index per `cwd` (via `git ls-files`/`rg --files`, respecting `.gitignore`), folders included and fuzzy filtering, top 20.
- Daemon: `commands.list` with skills and commands from the profile, the project, installed plugins and built-ins, cached with a watcher.
- App: suggestions when typing `@` and `/` in the prompt field, with incremental search and debounce.
- App: commands that open a menu in the TUI (`/model`, `/config` etc.) lead to the raw terminal.

## Capabilities

### New Capabilities
- `autocomplete`: file and command suggestions for the prompt field.

### Modified Capabilities

## Impact

`features/autocomplete` module in the daemon (dependencies `fuzzysort`, `yaml`); `src/features/autocomplete` in the app.
