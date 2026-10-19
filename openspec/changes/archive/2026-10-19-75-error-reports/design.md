## Context

The app already embeds React Native Firebase (`app`, `messaging`, `app-check`) for push, optional per platform: `app.config.ts` applies the Firebase plugins only when the Google services file exists, `react-native.config.js` unlinks the native modules otherwise, and JS loads them through `require` guarded by `firebaseEnabledFor(extra.firebase, os)`. Errors are invisible today: `DaemonClient` rejects requests with `DaemonRequestError(code)`, there is no global handler or error boundary of our own, and the daemon's router answers `DaemonError`s without logging them. Settings has a "Report a problem" link that only opens a blank GitHub issue.

## Goals / Non-Goals

**Goals:**
- Know about crashes and errors, with app/OTA/daemon versions and a stack trace.
- Nothing leaves the phone without consent, and never any session content.
- Work in builds without Firebase (local log + share/GitHub issue).

**Non-Goals:**
- Analytics, breadcrumbs of user actions, performance monitoring.
- Symbolicating JS stacks inside Crashlytics (it does not take JS source maps); the OTA update id in each report identifies the bundle, and `expo export` source maps can symbolicate it locally.

## Decisions

- **Crashlytics over Sentry or an own endpoint.** Same Firebase project and SDK family as push, no new account or DSN, native crash capture included. Its consent model fits: with automatic collection off, native crash reports wait on the device until `sendUnsentReports()` or `deleteUnsentReports()`.
- **Native config (`apps/mobile/firebase.json`).** `crashlytics_auto_collection_enabled: false` (nothing is sent before consent), `crashlytics_is_error_generation_on_js_crash_enabled: false` and `crashlytics_javascript_exception_handler_chaining_enabled: true`, so the RN Firebase JS handler never turns a raw JS error into a report. `@react-native-firebase/crashlytics` joins the optional Firebase plugins and the unlink list.
- **Our handlers wrap RN's, not RN Firebase's.** At start, `installErrorCapture()` saves the global handler React Native installed, loads Crashlytics (whose module constructor installs its own handler), then sets our handler, which records the entry and chains to the saved RN handler. Unhandled rejections use Hermes' `enablePromiseRejectionTracker` (the RN Firebase tracker hooks the `promise` polyfill, which Hermes does not use). Render errors come from `ErrorBoundary` exported by the root layout (Expo Router), which shows a themed "Something went wrong / Try again" screen. Failed requests come from a new `DaemonClient.onRequestError` listener: error replies (except `unknown_type`, the expected answer of older daemons) and timeouts, with the message type and code only, never the daemon's message.
- **Allowlist, not blocklist (`scrub.ts`).** An entry is built field by field from a fixed shape; anything else is dropped. Free text is scrubbed: text between quotes or backticks becomes `‹…›`, URLs become `‹url›`, emails `‹email›`, absolute and home-relative paths keep only their base name (`‹path›/index.bundle`), long hex/base64 runs become `‹token›`, and the result is cut to 300 characters (message) or 30 frames / 3000 characters (stack). Request errors have no message at all. Route is the Expo Router segment pattern (`(main)/session/[id]`), never the concrete path. Tests cover "a transcript string never ends up in a report" across all sources.
- **Context.** App version, runtime version, OTA update id and channel, platform and OS version, daemon version (`auth.ok`), taken when the entry is recorded.
- **Local log (`expo-file-system`).** JSON file in the document directory with the last 50 entries; fatal entries are written synchronously (the app is about to die), others are batched (1 s). A `handledAt` time in SecureStore marks the crashes already dealt with.
- **Consent state (pure `consent.ts`).** Preference `auto | ask | never`, default `ask`, stored in SecureStore. On launch, `launchAction(pref, pendingCrash)`: `auto` → send pending; `ask` → prompt when there is a pending crash (a fatal JS entry newer than `handledAt`, or unsent native reports); `never` → discard (delete unsent native reports). Collection is enabled natively only in `auto`.
- **Sending.** Each entry becomes `recordError(new Error(scrubbed message) with scrubbed stack, name)` after setting the context attributes; then `sendUnsentReports()`. A manual report adds a "UserReport" entry with the description as an attribute (cut to 1000 characters). "Send" is hidden with `never` and in builds without Firebase.
- **Crash prompt.** A bottom sheet mounted by the root layout after a crash with `ask`: what happened, the preview (exact report text), "Send" / "Don't send", and the three preference choices.
- **Report a problem.** A `(main)/report` route: description, "include the computer's recent errors" (fetched with `diagnostics.errors` when connected; hidden on older daemons), preview, and Send / Share / GitHub issue. Share writes the report to a cache file and shares its URL on iOS; Android shares the text. The GitHub URL carries a title and a body capped at 6000 characters (the most recent entries first, stacks cut to 5 frames).
- **Daemon.** `MessageRouter` takes an `onRejected(type, code)` callback: `DaemonError` rejections are logged at `warn` with `{ type, code }`, unknown types at `info`, handler crashes stay at `error` with `code: 'internal'`. `features/diagnostics` keeps the last 50 `{ at, type, code }` and answers `diagnostics.errors` with `diagnostics.result { daemonVersion, errors }`.

## Risks / Trade-offs

- [New native modules] → needs a new build; the fingerprint runtime version keeps this JS from older binaries.
- [Scrubbing heuristics may drop useful detail] → preferable to leaking content; the preview shows exactly what is sent.
- [Crashlytics metadata] → the SDK adds device model, OS and an installation id; the README lists them.
- [Device check] → crash capture, the prompt and delivery need a check on a device with Firebase; the logic behind them is unit tested.
