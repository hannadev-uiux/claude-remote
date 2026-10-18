## 1. Protocol and daemon

- [x] 1.1 `SubagentInfoSchema`: `startedAt` (nullable, default `null`) and `toolCount` (default 0)
- [x] 1.2 Tracker: `startedAt` from the file's birth time or discovery, incremental and serialized `toolCount` with `parseTranscriptLine`, settled on `SubagentStop`; hooks and sweep keep both; tests

## 2. App

- [x] 2.1 `formatElapsed` to `core/utils/time.ts`; `subagentCounts` and `subagentElapsed` in `features/subagents/sort.ts` with tests
- [x] 2.2 `sessionMenu` item `subagents` (absent without subagents, label with counts) with tests; `ActionMenu` `attention` dot
- [x] 2.3 `SubagentsSheet` (sorted rows: label, state pill, elapsed, tools; opens the conversation); strip removed from the session screen; i18n pt-BR, en-US, es-ES

## 3. Verification

- [x] 3.1 `pnpm check` green; `npx expo export --platform ios` bundles
