## 1. Setup

- [x] 1.1 `npx expo install @react-native-firebase/perf`; `firebase.json` `perf_auto_collection_enabled: false`; `app.config.ts` keeps the perf Gradle plugin out (comment).

## 2. App

- [x] 2.1 `features/performance/stalls.ts`: pure stall rules and summary, with tests.
- [x] 2.2 `features/performance/perf.ts`: lazy native wrapper (collection switch, traces); `store.ts`: per-device setting restored at start.
- [x] 2.3 `use-performance.ts`: applies the setting, `app_ready` and `js_responsiveness` traces; mounted in the root layout.
- [x] 2.4 Settings → Error reports: "Send performance data" switch; i18n in pt-BR, en-US and es-ES.

## 3. Docs and validation

- [x] 3.1 Privacy policy and troubleshooting docs in the three languages.
- [x] 3.2 `pnpm check` green and `npx expo export --platform ios` bundles.
