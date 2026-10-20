## Why

There is no visibility into the app's performance on real devices (issue #267). An iPad (9th generation) froze shortly after opening the app, and nothing on the phone or in Crashlytics tells whether the app caused it or what it was doing. Crashlytics only sees crashes, not a frozen screen or a busy JavaScript thread.

## What Changes

- Firebase Performance Monitoring (`@react-native-firebase/perf`, installed with `npx expo install`) in builds that have Firebase. It reuses the Firebase project already used for push and Crashlytics.
- Collection is **off by default** (`perf_auto_collection_enabled: false` in `firebase.json`). A new "Send performance data" switch in Settings → Error reports turns it on for this device. The choice is saved on the phone and applied at start.
- With collection on, Firebase records its automatic traces:
  - app start and time in the foreground and background;
  - slow and frozen frames;
  - on iOS, the app's own HTTPS requests (push relay, update server), which never include the computer's address.

  Android leaves out the Gradle plugin that instruments network requests.
- Two custom traces without content:
  - `app_ready`: the metric `ready_ms`, from the JavaScript start to the first connection to the daemon, with the attribute `outcome` (`connected` or `timeout` after 60 s).
  - `js_responsiveness`: one trace per stretch of the app in the foreground. It holds the JavaScript stalls measured by a timer that runs while collection is on: the count of stalls of 1 s or more, the count of 5 s or more, the longest and the total in milliseconds. It has one attribute, `layout` (`compact`, `regular` or `wide`).
- No Analytics. Nothing from sessions, prompts, paths or the daemon is attached to a trace.
- The privacy policy (pt-BR, en-US, es-ES) describes the opt-in performance data, and the landing page's "No telemetry" becomes "Opt-in only". The troubleshooting docs say where to read the metrics in the Firebase console.

## Capabilities

### New Capabilities
- `performance-monitoring`: opt-in Firebase Performance Monitoring with app-ready and JavaScript responsiveness traces

### Modified Capabilities

## Impact

- `apps/mobile`:
  - `package.json` (`@react-native-firebase/perf`), `firebase.json`, `app.config.ts` (no perf Gradle plugin; comment);
  - `src/features/performance/` (pure stall rules with tests, native wrapper, setting store, hook);
  - Settings card;
  - i18n.
- `apps/web/content/*/privacy.md` and `troubleshooting.md`, and `apps/web/src/i18n/*` (landing).
- Needs new iOS and Android builds: Performance is a native SDK.
