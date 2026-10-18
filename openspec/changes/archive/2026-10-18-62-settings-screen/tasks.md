## 1. Protocol and daemon

- [x] 1.1 `device.unregister { fcmToken }` in the protocol (fixture) and the daemon handler that drops the token from the device registry

## 2. App

- [x] 2.1 `usePushSettings` (per-phone, SecureStore) and `usePush` syncing register / unregister on connect and on change; `summary.ts` (`machineMeta`, `mutedSummary`) with tests
- [x] 2.2 `MachineCard` (pill, editable name, meta line, Forget), `ProfilesCard` (badge, name, detail, details sheet with the notifications toggle), `NotificationsCard` (push toggle with status and test, live status, Muted row and sheet), App card links; `SettingsScreen` composition, route and root layout; remove `PushCard` and `LiveStatusCard`; i18n pt-BR, en-US, es-ES

## 3. Verification

- [x] 3.1 `pnpm check` green; `npx expo export --platform ios` bundles
