## 1. Protocol and daemon

- [x] 1.1 Implement `DeviceRegistry` and `PushService` (lazy firebase-admin, foreground suppression, minimal payload); verify with tests using a fake sender
- [x] 1.2 Wire `Stop`, `Notification` and `permission.request` to `PushService`; verify with an integration test

## 2. App

- [x] 2.1 Configure `@react-native-firebase` and `expo-notifications` in `app.config.ts`; verify with `npx expo config --type introspect`
- [x] 2.2 Implement token registration, `app.visibility`, deep link and Allow/Deny actions; verify with typecheck
