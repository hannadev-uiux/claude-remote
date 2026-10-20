## Context

The daemon builds the Android live status in `buildLiveMessage` as an FCM notification message (`android.notification` with a per-session `tag`). The system draws it while the app is in the background, so the app has no say in it and cannot add actions. On Android, two FCM services are declared: RN Firebase's (priority 0) and expo-notifications' (priority -1). RN Firebase's receives the messages, so data messages reach JS through `messaging().setBackgroundMessageHandler` (headless JS) and `onMessage` (foreground). expo-notifications presents local notifications with the request identifier as the Android tag (same identifier → replaced in place), supports `sticky` (ongoing) and categories with actions. An action that does not open the app is delivered to JS only through a task registered with `Notifications.registerTaskAsync` (expo-task-manager) when the app is not in the foreground, and through `addNotificationResponseReceivedListener` when the JS runtime is alive.

## Goals / Non-Goals

**Goals:**
- Allow / Deny on the Android live status, answered without opening the app.
- No regression for older apps (they keep the system-drawn notification) or older daemons (the app keeps showing what they send).

**Non-Goals:**
- A custom Android layout (RemoteViews) with the timer and glyph colors: the text notification stays as it is.
- Changing the regular permission pushes (they are still system-drawn on Android).

## Decisions

- **Opt-in per registration (`androidDataMessages`)** rather than by daemon version: the daemon cannot know whether the app on the phone can render, and an app that could not would show nothing at all. Zod strips the unknown key on older daemons, so they keep sending notification messages; the app's handlers ignore messages without `data.live`.
- **One JSON string in `data.live`.** FCM data values are strings. One field is validated with one schema (`LiveDataMessageSchema`) instead of flattening the props. The props already follow the content rules. The size stays well under FCM's 4 KB, and a test guards it.
- **`collapseKey` = `live-<sessionId>`**, so FCM keeps only the latest pending update per session for an offline phone. Priority `normal` for working updates and `high` for what the user may act on (waiting, done, closed, end), the same rule as `apns-priority`, so step updates do not spend the app's high-priority budget.
- **Formatter in the protocol package (`liveNotificationText`)**: the daemon's legacy notification and the app's rendered one read the same, without two copies.
- **Category per render:** before presenting a notification with `pending`, the app (re)sets the `LIVE_PERMISSION` category with the labels that came in the props (the daemon's language, like on iOS). Action identifiers are the existing `ALLOW` / `DENY`, so the existing `handleResponse` answers them when the app is alive.
- **Background entry file:** `index.ts` registers the RN Firebase background handler and the expo-task-manager task at module scope, then imports `expo-router/entry`. Headless JS never mounts the router, so registration inside a route or hook would not run.
- **expo-task-manager is optional at runtime:** loaded with `require` in a try/catch. Without it (an old binary updated over the air), the live category's actions open the app (`opensAppToForeground: true`) and the existing launch-response path answers them.

## Risks / Trade-offs

- [Android may delay `normal` data messages in Doze] → waiting, done and closed (what the user acts on) go `high`; step-only updates may arrive late, as before.
- [Headless JS can be killed on low memory] → the next update redraws the notification; a lost answer leaves the request pending in the terminal, and the session opens when `respondInBackground` fails in a live process.
- [Two renderers during rollout] → the flag decides per registration, so a phone never gets both.
