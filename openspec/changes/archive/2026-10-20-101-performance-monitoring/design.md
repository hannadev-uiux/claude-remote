## Context

The app already ships RN Firebase (`app`, `messaging`, `app-check`, `crashlytics`, all 26.4). Crashlytics collection is off until the user opts in (`firebase.json`, `features/error-reports`), and every Firebase module loads only when the build has that platform's Google services file (`firebaseEnabledFor`). The privacy policy promises no telemetry beyond opt-in error reports.

## Decisions

- **Opt-in, per device, off by default.** `perf_auto_collection_enabled: false` makes the native SDK start disabled (`firebase_performance_collection_enabled` in Info.plist and the Android manifest). The setting (`remote-harness.performance`, SecureStore) sets `dataCollectionEnabled` and `instrumentationEnabled` at start and when it changes. The setting is shown only when the build has Firebase.
- **No Android network instrumentation.** RN Firebase's perf config plugin only adds the Gradle plugin that rewrites OkHttp and HttpURLConnection calls. It is not applied, so Android records app start, screen rendering and custom traces only. Android's WebSocket to the daemon runs on OkHttp, and it is never instrumented. On iOS the automatic network monitoring stays: the app's HTTP requests go to the project's push relay and update server. The WebSocket (SocketRocket) and the terminal's WebView are not NSURLSession requests.
- **Stall monitor.** A 500 ms timer runs while collection is on and the app is active. The time a tick fires late, measured against when it was due, is how long the JavaScript thread was blocked. Pure functions turn the delays into a summary (count of stalls of 1 s or more, count of 5 s or more, longest, total). The `js_responsiveness` trace starts when the app becomes active and stops when it leaves the foreground, with the summary as metrics. A freeze that never returns (the system kills the app) loses that trace. The next start still shows a long `app_ready` or a missing session, which is a data point in itself.
- **`app_ready`** measures in JavaScript from when the module loads to the first `open` connection status, or to 60 s with `outcome: timeout`. A trace cannot be started before the saved choice is read, so the time goes in the metric `ready_ms` of a trace sent at that point. With collection off at start, the run is not measured.
- **No Analytics.** It adds an install id, screen views and default events for no gain over the traces above.

## Risks / Trade-offs

- [Firebase Performance batches uploads; data appears in the console after some minutes, and in debug builds only with the debug flag] → The troubleshooting docs say so.
- [The stall timer costs a little CPU] → It runs only while collection is on and the app is active, once every 500 ms.
