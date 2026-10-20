## 1. Protocol

- [x] 1.1 Add `androidDataMessages?: boolean` to `live.register`, `LiveDataMessageSchema` (`{ event: 'update' | 'end', props }`) and `liveNotificationText(props)` (title and body, moved from the daemon's sender) with tests.

## 2. Daemon

- [x] 2.1 Keep `androidDataMessages` with the registration and pass it to the sender (`LiveMessage`).
- [x] 2.2 `buildLiveMessage`: data message for flagged Android registrations (`data.live`, `collapseKey`, `high`/`normal`), legacy notification otherwise, both using `liveNotificationText`. Tests: payload, priority, size, legacy unchanged, relay path accepts it.

## 3. App

- [x] 3.1 `npx expo install expo-task-manager`.
- [x] 3.2 Pure `android-notification.ts`: parse `data.live`, build the notification request (identifier, title, body, sticky, category, data), the resolved variant; Vitest tests.
- [x] 3.3 `background.ts`: present the notification (category with the pending labels), the RN Firebase background handler and the expo-task-manager task answering actions; `index.ts` entry and `package.json` `main`.
- [x] 3.4 Foreground: `onMessage` draws it too; `handleResponse` drops the buttons after a successful answer; `use-live-status.ts` sends `androidDataMessages` on Android.

## 4. Validation

- [x] 4.1 `pnpm check` green and `npx expo export --platform android` bundles.
