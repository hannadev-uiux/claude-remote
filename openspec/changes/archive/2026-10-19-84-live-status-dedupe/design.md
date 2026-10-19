## Context

- `use-live-status.ts` starts an iOS activity with `SessionActivity.start(props, 'claude-remote://session/<id>')` when a session turns `running` while the app is in front. It registers the activity push token with the daemon (`live.register`), and updates or ends it locally until the daemon takes over.
- The started activities live in a `Map` created inside the effect that depends on `client`.
- `expo-widgets` exposes `getInstances()`. It returns the activities of the type that are still active or stale, with their ActivityKit id (`getId()`), but not their props or URL. Ended activities (an ended "done" activity waiting for its dismissal) are not returned and cannot be updated.
- The daemon's `LiveStatusService` keeps one registration per session, sends `update` events and, on `Stop`, an `end` with a dismissal 15 minutes later, then drops the registration.

## Goals / Non-Goals

**Goals:**
- never two activities for one session, whatever restarts in between;
- a new turn within the done window reuses the activity;
- the task count;
- pure, tested matching logic.

**Non-Goals:**
- a native module to read activity attributes;
- the cross-session summary activity;
- push-to-start.

## Decisions

- **Persisted map instead of reading attributes.** `sessionId → { activityId, doneAt? }` in the secure store (`remote-harness.live-activities`), written when an activity starts or turns done, and removed when it ends. Reading the attributes' URL would need a native module. The map is enough because only the app starts activities: an activity iOS still has that the map does not name is an orphan from an older run.
- **Reconcile** (`reconcileActivities(map, aliveIds, sessions, now)`, pure): for every alive id, keep it if the map gives it to a session that exists and is working or waiting, or that is idle but still inside its done window (`doneAt + 15 min > now`). Every other alive id is ended (`immediate`). Map entries whose activity is gone are dropped. If two ids claim one session (not possible with the map, but cheap to guard), the newest entry wins. It runs when the effect starts (connect, reconnect, JS restart) and when the app returns to the foreground. Kept activities are adopted into the in-memory tracking, get their props refreshed, and their push token is registered again (the daemon may have restarted).
- **Start reuses.** `start(session)` looks for the session's tracked activity, then for its adoptable one. If one is found it updates it to "working" with a new start time and registers it again. Otherwise it starts one and saves it in the map.
- **Done is an update, not an end.**
  - Daemon: `Stop` sends an `update` with the done props and a stale date, keeps the registration and schedules an `end` (dismiss now) after 15 minutes.
  - A `UserPromptSubmit` in that window cancels the end and sends "working" to the same activity token.
  - `SessionEnd` and mute still end at once. A daemon restart loses the timer; the app's reconcile ends done activities older than the window, and iOS ends any activity after 8 hours anyway.
  - App: when it handles the done state locally, it updates the activity, records `doneAt` in the map and ends it after the window if it is still in front. Otherwise the daemon or the next reconcile ends it.
- **Task count.** `tasks` = `backgroundTasks` + subagents with `state === 'running'`, from the session store. The daemon follows `store.onChange` for registered sessions and feeds a `tasks` event to the reducer. A count change is throttled like a step change, and the props carry the translated text (`1 task running`, `2 tasks running`), empty at 0. The app's local props compute the same text from the session it has. The widget appends it to the state line; Android appends it to the body.
- **Android**: the done notification is sent as an update that is not sticky, then the same notification is re-sent as the end after 15 minutes (`tag` per session, so it replaces itself).

## Risks / Trade-offs

- If the secure store write fails, the next reconcile treats that activity as an orphan and ends it: one activity disappears instead of two showing. That is the safer failure.
- A done activity now stays "active" for 15 minutes, so iOS may count it toward the per-app activity limit. The limit is several activities, and they end after the window.
- Older apps keep their behavior against a newer daemon, but the done window changes there too. For them, "done" now ends 15 minutes later through `end` (dismiss now) instead of `end` with a dismissal date: same visible result.
