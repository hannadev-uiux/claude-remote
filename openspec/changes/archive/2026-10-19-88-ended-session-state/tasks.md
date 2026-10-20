## 1. Daemon

- [x] 1.1 `sessions/state.ts` (`hookState`, `revives`, `acceptsHook`, `stateAfterPermission`) with tests; `handleHook` drops state/pane/control of late hooks; `permission.resolved` uses `stateAfterPermission`
- [x] 1.2 Resume path ends a session whose pane closed; test
- [x] 1.3 Ended transition: `broker.cancelAll`, live status end; push and live status skip late hooks of ended sessions; tests
- [x] 1.4 Parser drops the `(no content)` placeholder; test

## 2. App

- [x] 2.1 `pendingForStrip` leaves out read-only waiting sessions and requests of ended sessions; tests

## 3. Verify

- [x] 3.1 `pnpm check`, `openspec validate --strict`, iOS bundle export
