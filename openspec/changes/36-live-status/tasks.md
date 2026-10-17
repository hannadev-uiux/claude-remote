## 1. Protocol

- [x] 1.1 `live.register` / `live.unregister` client messages and `LiveStatusProps` with tests

## 2. Daemon

- [x] 2.1 Pure `toolStep`, `reduceLiveStatus`, `planSend` and `liveProps` with tests
- [x] 2.2 `TranscriptService.follow` (internal listeners sharing the stream) with tests
- [x] 2.3 `buildLiveMessage` (iOS Live Activity and Android tagged notification) and `PushSender.sendLive`
- [x] 2.4 `features/live-status`: registry, hook/permission/transcript wiring, throttle timers, mute, handlers; push texts in the three catalogs

## 3. App

- [x] 3.1 `expo-widgets` + `@expo/ui`, config plugin (push, frequent updates)
- [x] 3.2 `SessionActivity` widget layout (banner, compact, minimal, expanded)
- [x] 3.3 Pure `shouldStartLive` / `localLiveProps` with tests; `useLiveStatus` (start, register, local updates, end)
- [x] 3.4 Settings toggle (persisted, default on), Android "Live status" channel, i18n keys

## 4. Verification

- [x] 4.1 `pnpm check` green (protocol 68, daemon 267, mobile 192 tests), `npx expo export --platform ios` bundles, `expo prebuild` generates the widget target and the iOS build compiles
