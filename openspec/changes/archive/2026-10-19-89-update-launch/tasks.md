## 1. Daemon

- [x] 1.1 `UpdateChecker`: `head` dep, stale `available` dropped on load, `recheck`; tests
- [x] 1.2 `launchRefusal` (pure) and `launch` result; `onExit` resets `updating` on any code, rechecks on 0; tests
- [x] 1.3 `RemoteUpdates`: refusal before recording, reason messages, spawn error recorded; tests

## 2. App

- [x] 2.1 `availableLabel` with "new commits", `updateStartError` mapping; card; i18n (three catalogs); tests

## 3. Verify

- [x] 3.1 `pnpm check`, `openspec validate --strict`, iOS bundle export
