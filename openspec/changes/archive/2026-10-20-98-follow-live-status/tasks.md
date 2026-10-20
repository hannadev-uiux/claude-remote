## 1. Protocol

- [x] 1.1 `LiveFollowDeviceSchema`, `live.follow` / `live.unfollow` / `live.autoFollow` / `live.follows`, `live.followed`, `auth.ok.live` (tests).

## 2. Daemon

- [x] 2.1 `live-status/follows.ts`: pure rules (`followExpired`, `shouldStartFollowed`) and `FollowStore` (per phone, atomic writes), with tests.
- [x] 2.2 `push/sender.ts`: `buildLiveMessage` with event `start` (push-to-start) and the fallback push, with tests.
- [x] 2.3 `LiveStatusService`: entries awaiting the activity token send nothing until the app registers it (test).
- [x] 2.4 `live-status/index.ts`: handlers, start on `UserPromptSubmit`, drop on end and expiry (sweep), auto-follow on new sessions; i18n; `auth.ok.live`.

## 3. App

- [x] 3.1 `patches/expo-widgets@57.0.26.patch`: `LiveActivity.getUrl()`.
- [x] 3.2 `live-status/logic.ts`: `sessionIdFromActivityUrl`, `reconcileActivities` adopts followed orphans (tests).
- [x] 3.3 `follow-store.ts` + `use-live-follow.ts`: push-to-start token, device data, `live.follows` on connect, follow / unfollow / auto-follow, setting off unfollows all.
- [x] 3.4 UI: session menu and action sheet items, row and header mark, profile sheet switch; i18n in pt-BR, en-US and es-ES.

## 4. Validation

- [x] 4.1 `pnpm check` green and `npx expo export --platform ios` bundles.
