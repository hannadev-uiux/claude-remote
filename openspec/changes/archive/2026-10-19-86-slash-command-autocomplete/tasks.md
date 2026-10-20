## 1. Daemon

- [x] 1.1 Built-in table refreshed against Claude Code 2.1.304 (`interactive` per command) with a test (no duplicates, valid names, descriptions)

## 2. App

- [x] 2.1 `ranking.ts`: `matchCommand`, `rankCommands` (sections with no query, tiers + recents + highlight with a query); tests
- [x] 2.2 `recents.ts` (`recordUse`, `recentNames`, parse) with tests; secure-store backed store restored at app start, cleared by "Forget the machine"; record on send
- [x] 2.3 `SuggestionList`: `SectionList` with section headers, highlighted names, interactive icon, 44 pt rows, keyboard-aware height, "no commands match"; `filterCommands` replaced
- [x] 2.4 Translations of every built-in, sections, empty state and interactive label (three catalogs); `BUILTIN_KEYS` updated

## 3. Verify

- [x] 3.1 `pnpm check`, `openspec validate --strict`, iOS bundle export
