## 1. Protocol and daemon

- [x] 1.1 Protocol: `QueuedMessageSchema`, `InputModeSchema`, `session.input.mode`, `queue.update` / `queue.remove` / `queue.sendNow` / `queue.flush`, `session.queue`; tests
- [x] 1.2 `features/queue/queue.ts` (pure: busy, deliverable, canDeliver) and `service.ts` (submit with modes, auto delivery on idle with settle and turn grace, failure keeps the item, sendNow, flush, update, remove, clear on end, persistence, replay); `index.ts` registers `session.input` and `queue.*`; `main.ts` wiring; `paths.queue`; tests

## 2. App

- [x] 2.1 `features/queue/store.ts` (`bindQueue`), `logic.ts` (`willQueue`) with tests; `usePrompt` modes (`send`, `sendNow`); composer long press and ⌘⏎ send now, `Hold: send now · ⌘⏎` hint
- [x] 2.2 `QueueCard` (dashed `QUEUED · N`, rows with edit sheet / remove / send now, errors, `Send all now`) in the session footer; i18n pt-BR, en-US, es-ES

## 3. Verification

- [x] 3.1 `pnpm check` green; `npx expo export --platform ios` bundles
