## 1. Protocol and daemon

- [x] 1.1 `RejectedRequestSchema`, `diagnostics.errors` client message and `diagnostics.result` server message; samples in the protocol tests
- [x] 1.2 `MessageRouter` `onRejected(type, code)`: `DaemonError` rejections logged at warn with type + code, unknown types at info; tests
- [x] 1.3 `features/diagnostics`: ring of the last 50 rejections and the `diagnostics.errors` handler, wired in `main.ts`; tests

## 2. App: pure logic

- [x] 2.1 `scrub.ts`: scrubbing of messages and stacks and the allowlisted entry builder, with tests (including "a transcript string never ends up in a report")
- [x] 2.2 `consent.ts` (preference, `launchAction`, `canSend`) and `log.ts` (append with rotation, pending crashes) with tests
- [x] 2.3 `format.ts`: report text, report JSON and the GitHub issue URL (body cap) with tests

## 3. App: native and side effects

- [x] 3.1 `@react-native-firebase/crashlytics` and `expo-file-system` via `npx expo install`; `firebase.json`; Crashlytics in the optional Firebase plugins (`app.config.ts`, `react-native.config.js`)
- [x] 3.2 Storage of the log (file, sync for fatal entries) and the preference/`handledAt` (SecureStore); zustand store
- [x] 3.3 Crashlytics adapter (guarded load, collection toggle, attributes, `recordError`, unsent reports)
- [x] 3.4 Capture: global handler chained to RN's, Hermes rejection tracker, `DaemonClient.onRequestError`, route pattern and context
- [x] 3.5 Root `ErrorBoundary` with the themed fallback

## 4. App: UI

- [x] 4.1 Crash prompt sheet on launch (preview, Send / Don't send, preference choices)
- [x] 4.2 Settings "Error reports" card (preference + "Report a problem"), replacing the old GitHub link
- [x] 4.3 "Report a problem" route (description, computer errors, preview, Send / Share / GitHub issue)
- [x] 4.4 `errorReports.*` strings in pt-BR, en-US and es-ES

## 5. Docs and verification

- [x] 5.1 README section: what is collected, where it goes, how to turn it off; privacy policy, docs Settings page and store privacy paragraph in the three languages
- [x] 5.2 `pnpm check` green (protocol 116, daemon 426, mobile 435, web 48) and `npx expo export --platform ios` bundles; `expo config --type introspect` with the Firebase files applies the Crashlytics plugin. Crash capture, the prompt and Crashlytics delivery still need a device check on a new build with Firebase
