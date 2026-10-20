## Why

On iOS the live status shows **Allow / Deny** when a session waits for a permission (#158, #179). On Android the live status is an ongoing notification the system draws from the push payload (`android.notification`), and such notifications cannot carry action buttons: the user has to open the app to answer (#192).

## What Changes

- **Protocol:** `live.register` gains `androidDataMessages?: boolean`. The Android app sets it when it can draw the live status itself. The wire shape of the data message is a schema: `LiveDataMessageSchema` (`{ event, props }`), and `liveNotificationText(props)` builds the notification title and body, shared by the daemon (legacy path) and the app.
- **Daemon:** for a registration with `androidDataMessages`, the Android live status is an FCM **data message**: `data.live` holds the JSON `{ event, props }`, with `collapseKey` per session. Priority is `normal` for working updates and `high` otherwise (waiting, done, closed, end), like `apns-priority`. Registrations without the flag (older apps) keep the system-drawn notification, unchanged.
- **App (Android):** draws the notification from the data message with `expo-notifications`:
  - same per-session identifier (each update replaces the last), same low-importance channel, same title and body;
  - persistent while working or waiting;
  - when `pending` is set, **Allow** and **Deny** actions labeled with the translated `pending.allow` / `pending.deny`.
- **Where messages are handled:**
  - with the app in the background or closed: RN Firebase's background handler (headless JS), registered from a new entry file (`index.ts`) before Expo Router;
  - in the foreground: `onMessage`.
- **Answers:** actions answer through `permission.respond` over a short-lived connection (`respondInBackground`), the same path the iOS widget uses.
  - When the app is closed, they reach JS through an `expo-task-manager` background notification task.
  - The notification then shows the resolved state at once (buttons removed) until the daemon's next update.
  - A failed answer opens the session.
- **Old binaries:** a binary without `expo-task-manager` (an over-the-air update on an old build) gets actions that open the app to answer.
- Content rules unchanged: title, folder, state, step category and counts, never the conversation.

## Capabilities

### New Capabilities

### Modified Capabilities
- `live-status`: Android live status drawn by the app from data messages, with Allow / Deny actions; `live.register` gains `androidDataMessages`.

## Impact

- `packages/protocol`: `androidDataMessages` on `live.register`, `LiveDataMessageSchema`, `liveNotificationText`.
- `apps/daemon/src/features/push/sender.ts` (`buildLiveMessage`), `features/live-status/{index,service}.ts`.
- `apps/mobile`: new `index.ts` entry (`package.json` `main`), `src/features/live-status/android-notification.ts` (pure, tested), `src/features/push/background.ts` (handlers), `use-push.ts` (foreground `onMessage`), `use-live-status.ts` (sends the flag), `expo-task-manager` dependency.
- Needs a new Android build for actions with the app closed. The rest works over the air on builds with RN Firebase.
