## 1. Protocol

- [x] 1.1 `LiveStatusProps` new fields with defaults and `auth.ok.host`, with tests

## 2. Daemon

- [x] 2.1 Reducer with `recent`, `changedAt`, `endedAt`; `liveProps` with host, session, path and `ago`; tests
- [x] 2.2 Service and feature wiring (session title/cwd, host name, `now` into the reducer), `auth.ok.host`; Android title; texts in the three catalogs

## 3. App

- [x] 3.1 `live-activity-icon.png` in `scripts/icons.mts` and the config plugin that adds it to the widget extension
- [x] 3.2 New `SessionActivity` layout (banner, Dynamic Island)
- [x] 3.3 `localLiveProps` with the new fields and tests; local updates only without daemon updates; Settings hint in the three languages

## 4. Verification

- [x] 4.1 `pnpm check` green (protocol 72, daemon 274, mobile 198 tests; Biome run on the changed paths), `npx expo export --platform ios` bundles, `expo prebuild` adds `Assets.xcassets` to the widget target's own Resources phase
