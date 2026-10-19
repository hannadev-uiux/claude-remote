## 1. Daemon

- [x] 1.1 Store: an explicit newer `updatedAt` counts as a change; pane links persist `updatedAt`; `restore()` keeps it (transcript mtime, then now, as fallbacks); tests ("restart does not reorder", older stamps and metadata refreshes ignored)
- [x] 1.2 `TranscriptService.onActivity` + `SessionService.noteActivity` throttled to 5 s per session, wired in `main.ts`; tests

## 2. App

- [x] 2.1 `sort-store.ts` (recent | state, persisted), `listSessions` with sort and tests, sort chip in the filter row, restore at start
- [x] 2.2 Compact relative time (`now`, `N min`, `N h`, `yesterday`, `N d`) with `time.*` keys in pt-BR, en-US, es-ES; `sessions.sort.*`; tests updated

## 3. Verification

- [x] 3.1 `pnpm check` green (turbo typecheck + tests 10/10; Biome on `apps packages`)
