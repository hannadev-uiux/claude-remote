## 1. Protocol and daemon

- [x] 1.1 `tasks` in `LiveStatusPropsSchema` (default `''`) with a test
- [x] 1.2 Reducer: `tasks` event and count in the status; `liveProps` translated `tasks`; throttled like steps; i18n (three catalogs); tests
- [x] 1.3 Service: done is an `update`, registration kept, `end` after 15 minutes unless a new prompt; task count from `store.onChange`; Android done not sticky and body with tasks; tests

## 2. App

- [x] 2.1 `logic.ts`: `reconcileActivities`, `parallelTasks`, task text in `localLiveProps`; tests
- [x] 2.2 Persisted activity map (secure store) and the hook: reconcile on connect and foreground, start reuses, done updates and records `doneAt`; widget state line with `tasks`; i18n (three catalogs)

## 3. Verify

- [x] 3.1 `pnpm check`, `openspec validate --strict`, iOS bundle export
