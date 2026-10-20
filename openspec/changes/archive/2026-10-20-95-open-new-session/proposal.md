## Why

After creating a session from the New session screen, the app just goes back to the session list (`NewSessionScreen` calls `router.back()` once `session.start` succeeds). The user has to find the new session in the list and open it to type the first prompt, which is the very next thing they want to do (issue #245).

## What Changes

- `session.start` is answered with a dedicated `session.started` reply carrying `paneId` and `sessionId` (`string | null`), instead of a generic `ack`. The daemon launches the pane as before, then waits briefly (bounded) for the session's `SessionStart` hook to register it against that pane; `sessionId` is the registered session id, or `null` when it has not registered within the wait window yet.
- The New session screen navigates straight into the new session (`router.replace` to `/session/[id]`, with the composer requesting focus) as soon as `sessionId` is known. When the reply comes back with `sessionId: null`, the screen instead shows a starting indicator ("Starting Claude Code in ~/project…") and watches the session store for a session whose `paneId` matches the one just launched, navigating in as soon as it appears.
- On failure, the screen stays exactly as it does today: the form with a clear error (`startErrorMessage`, unchanged).
- A per-device setting "Open the session after creating it" (Settings, on by default); when off, `Start session` keeps today's behavior of returning to the list.
- **BREAKING**: `session.start`'s reply type changes from `ack` to `session.started`. No other client of this protocol exists outside this repo's app.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `protocol`: `session.start` is answered with `session.started { paneId, sessionId }` instead of `ack`.
- `session-lifecycle`: the daemon resolves (or times out resolving) the new session's id before answering `session.start`; the New session screen navigates into the created session instead of going back to the list.
- `app-shell`: the Settings screen gains the "Open the session after creating it" toggle.

## Impact

- `packages/protocol/src/client.ts` (reply type), `packages/protocol/src/server.ts` (new `session.started` message), its tests.
- `apps/daemon/src/features/lifecycle/service.ts` and `index.ts` (wait for the session to register against the launched pane, within a bounded timeout; return `sessionId`).
- `apps/mobile/src/features/lifecycle/NewSessionScreen.tsx` (navigate on success; starting indicator while `sessionId` is still unknown), `apps/mobile/src/features/autocomplete/SmartComposer.tsx` (focus request), a new per-device setting store and its Settings card, i18n catalogs (pt-BR, en-US, es-ES).
