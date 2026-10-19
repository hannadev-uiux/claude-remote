## Why

The lock screen fills up with duplicate Live Activities for the same session (issue #138): in a real case, 5 live statuses for 2 sessions, each with its own timer. The app keeps the activities it started in a `Map` created inside an effect, so whenever the effect re-runs or the JavaScript restarts (app killed, OTA reload, reconnect) the map is empty, `start()` cannot end the previous activity and a new one is added next to it. Activities ended with the 15-minute "done" dismissal also pile up next to the next turn's activity, since an ended activity cannot be updated again. There is also no way to tell from a live status that more than one task runs in the session.

## What Changes

- **One live status per session, across restarts.**
  - The app persists which activity belongs to which session (`sessionId → activity id`, in the secure store).
  - When the app connects and when it comes to the foreground, it lists the activities iOS still has (`getInstances()`), adopts the one of each session (updating it and registering it again with the daemon), and ends the ones it cannot match or that belong to sessions no longer working.
  - `start()` reuses the session's activity when there is one instead of starting another.
- **A finished turn keeps its activity alive.** On `Stop` the daemon (and the app, when it updates locally) updates the activity to "done" instead of ending it, and ends it 15 minutes later. A new turn in that window updates the same activity back to "working".
- **Daemon**: one registration per session, as today (`live.register` replaces it). The registration is kept during the done window so the new turn reaches the same activity; muted or closed sessions still end at once.
- **Tasks running in parallel**: the live status shows how many tasks run in the session ("2 tasks running"), counting background tasks and running subagents. It is a content-free count: a new `tasks` prop (translated, empty when none) in the state line on iOS and in the body on Android.
- Android keeps one notification per session (tag), and the "done" notification is no longer sticky.

## Non-goals

- The optional summary live status across sessions ("3 sessions · 1 waiting") from the issue: left for a later change once the per-session status is reliable.

## Capabilities

### Modified Capabilities
- `live-status`: start (reuse, reconcile), content (task count), updates (done window), protocol (`tasks`).

## Impact

`packages/protocol` (`tasks` in `LiveStatusProps`, default `''`), `apps/daemon` (live status reducer, service done window, tasks from the session store, Android message, i18n), `apps/mobile` (pure reconcile logic with tests, persisted activity map, hook rewrite, widget state line, i18n). The app needs a new build only for the widget's task count. The dedupe works over the air.
