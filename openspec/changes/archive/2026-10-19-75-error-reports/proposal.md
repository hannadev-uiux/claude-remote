## Why

When the app breaks (crash, unhandled error, failed request, render error) nobody finds out unless the user reports it by hand, and then there is no stack trace, app or daemon version, or context (issue #69). Bugs like "the start session button does nothing" are hard to investigate without logs.

## What Changes

- **Local error log (always on, never leaves the phone by itself).** The app records JS crashes (global handler), unhandled promise rejections, render errors (root error boundary) and failed daemon requests (error replies and timeouts) in a small rotating log on the device (last 50 entries). Each entry keeps only allowlisted fields: time, source, error name, scrubbed message, scrubbed stack, request type and error code, route pattern, and the app context (app version, runtime, OTA update id and channel, platform and OS version, daemon version).
- **Firebase Crashlytics as the destination**, through the RN Firebase project the app already uses for push. Automatic collection is off in the native config; the app turns it on only when the user chooses "Send automatically". The RN Firebase JS handlers never see raw errors: the app installs its own handlers on top and hands Crashlytics scrubbed errors only.
- **Consent.** Settings → "Error reports": **Send automatically / Ask each time / Never** (default: ask). After a crash, the next launch asks "The app closed unexpectedly. Send the report?" with a preview of exactly what will be sent and the same three choices. "Never" disables collection and deletes unsent native reports.
- **Report a problem** (Settings): a screen with a description field, the preview of the recent log and, when connected, the daemon's recent rejected requests; it can send through Crashlytics (unless "Never"), share the report (a file on iOS, text on Android) or open a prefilled GitHub issue.
- **Daemon.** Every rejected WS request is logged with its type and error code (no payload), kept in a small in-memory ring, and returned by the new `diagnostics.errors` request (`diagnostics.result`).
- README section on what is collected and how to turn it off. The privacy policy (which said "no crash reporting"), the Settings page of the docs and the store description are updated in the three languages.

## Capabilities

### New Capabilities
- `error-reports`: on-device error log, scrubbing allowlist, consent, crash prompt, Crashlytics delivery and the "Report a problem" screen.

### Modified Capabilities
- `protocol`: `diagnostics.errors` and `diagnostics.result` join the message catalog.

## Impact

`packages/protocol`: new messages and `RejectedRequestSchema`. `apps/daemon`: router reports rejections (logged with type + code), `features/diagnostics` ring and handler, tests. `apps/mobile`: new native modules `@react-native-firebase/crashlytics` and `expo-file-system` (needs a new build; the fingerprint runtime keeps the OTA updates away from older binaries), `firebase.json` (collection off by default, no JS crash generation), Crashlytics in the optional Firebase plugins of `app.config.ts` and `react-native.config.js`, `features/error-reports` (pure scrubbing / consent / log / formatting with Vitest tests, storage, capture, UI), root error boundary, Settings card and route, i18n in pt-BR, en-US and es-ES. `apps/web/content/*/privacy.md` and `using-the-app.md`, `apps/mobile/store/metadata.ts`. Builds without Firebase files keep working: the local log, sharing and GitHub issue still work, only "Send" is hidden.
