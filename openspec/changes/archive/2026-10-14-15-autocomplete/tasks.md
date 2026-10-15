## 1. Daemon

- [x] 1.1 Implement the file index (git/rg) with folders, cache and fuzzy search; verify with a test in a temporary git repository
- [x] 1.2 Implement reading skills/commands (profile, project, plugins), the built-in list and a cache invalidated by mtime; verify with a test in temporary directories
- [x] 1.3 Register `files.search` and `commands.list`; verify with a WS test

## 2. App

- [x] 2.1 Implement detection of the `@`/`/` token under the cursor and insertion of the suggestion; verify with unit tests
- [x] 2.2 Create `SuggestionList` integrated with `PromptComposer` using TanStack Query and debounce; verify with typecheck
- [x] 2.3 Open the raw terminal when sending interactive commands; verify with a test of the rule
