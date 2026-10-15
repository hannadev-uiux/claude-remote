## Why

Without push, the user only finds out that a session stopped or asked for permission if the app is open — and `/rc` notifies every device on the account (D7, A7).

## What Changes

- App: FCM token registration (`@react-native-firebase/messaging`) and delivery via `device.register`.
- Daemon: push delivery via `firebase-admin` on `Stop`, `Notification` and permission requests, only to registered tokens.
- Minimal payload: generic title, profile and session id (no session content).
- Deep link to the session on tap; "Allow" and "Deny" actions on the permission notification.
- No push when the app is connected and in the foreground.

## Capabilities

### New Capabilities
- `push-notifications`: push notifications targeted at the paired device.

### Modified Capabilities

## Impact

`features/push` in the daemon (`firebase-admin` dependency, local service account); app with `@react-native-firebase/app` and `messaging`, `expo-notifications` for action categories. Requires a paid Apple Developer account and a Firebase project.
