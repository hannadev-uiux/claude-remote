## Context

The daemon already sends content-free pushes through Firebase Admin (`features/push`) to registered FCM tokens, tracks session state from hooks, and streams transcripts to subscribed apps (`features/transcript`). The app uses RN Firebase for the FCM token and `expo-notifications` for categories and channels. The hooks installed in Claude Code settings do not include `PreToolUse`.

## Goals / Non-Goals

**Goals:** glanceable state of a running session on the lock screen on both platforms, updated while the app is suspended, with no session content in pushes.

**Non-Goals:** push-to-start (sessions started on the computer with the app closed), a determinate progress bar (Claude Code has no measurable progress), home screen widgets, live status for subagents.

## Decisions

### iOS: `expo-widgets`
Official Expo SDK 57 module: the layout is written with `@expo/ui/swift-ui` components in a `'widget'` function (compiled by `babel-preset-expo`), started/updated/ended from JS, with per-activity push tokens. The config plugin adds the widget extension, the App Group and `NSSupportsLiveActivities`; `enablePushNotifications` enables remote updates and `frequentUpdates` sets `NSSupportsLiveActivitiesFrequentUpdates`. Alternatives: a hand-written Swift extension via `@bacons/apple-targets` (more native code to maintain) or `expo-live-activity` (third-party, fixed template).

The widget runtime cannot import the app's i18n, so every text arrives as a prop (`status`, `step`, `tools`), already translated by whoever sends it. The elapsed time is `Text` with `dateStyle: 'timer'` from `startedAt`, so it ticks without updates.

### Updates through FCM, not APNs directly
The daemon already holds a Firebase service account; FCM HTTP v1 forwards Live Activity payloads when `apns.liveActivityToken` is set (`firebase-admin` 14 `ApnsConfig.liveActivityToken`), together with the device FCM token. The payload is `aps: { timestamp, event: update|end, content-state: { name: 'SessionActivity', props: <JSON string> }, stale-date, dismissal-date }`, as `expo-widgets` expects. No APNs key handling is added to the daemon.

### Android: tagged FCM notification
A notification message with `android.notification.tag = live-<sessionId>` replaces the previous one, on channel `live-status` (created by the app with low importance: no sound, no heads-up). FCM displays it even when the app is not running, so no headless JS task is needed. `sticky` keeps it after a tap until the turn ends; the final "done" update is not sticky. A true foreground-service "ongoing" notification would need native code in the app and is not worth it for v1.

### Step without new hooks
Installing `PreToolUse`/`PostToolUse` would require every user to re-run setup and would fire a hook for every tool call. Instead, `TranscriptService.follow(target, listener)` lets the live-status feature listen to the transcript of registered sessions (same watcher/poller as app subscriptions, closed when nobody listens). Entries map to steps with a fixed table: `tool_use` by tool name (`Bash` → command, `Edit`/`Write`/`MultiEdit`/`NotebookEdit` → editing, `Read` → reading, `Grep`/`Glob`/`LS` → searching, `WebFetch`/`WebSearch` → web, `Task`/`Agent` → agent, `TodoWrite` → planning, anything else → tool), `thinking` → thinking, `assistant_text` → writing. Only the category leaves the daemon.

### Pure reducer and throttle
`reduceLiveStatus(status, event)` handles `prompt`, `step`, `waiting`, `resumed`, `stop`, `end`. `planSend(previous, next, lastSentAt, now)` sends at once when the state changes, and step/tool-count changes at most every 15 s with a trailing timer. Both are tested. Registrations live in memory: after a daemon restart, activities go stale (`stale-date` 30 min after each update) and iOS removes them after 8 h at most.

### Starting from the app
`useLiveStatus` (mounted in the main layout) watches the sessions store. When a session goes from not running to `running` while the app is active, the setting is on and the session/profile is not muted, it starts the activity (iOS; ending a previous one for the same session) and sends `live.register` with the FCM token, platform and the activity push token (when it arrives, through `addPushTokenListener`). While the app is active it updates/ends the iOS activity locally on state changes too. A daemon without `live.register` answers `unknown_type`; the app then keeps only the local updates.

## Risks / Trade-offs

- [APNs throttles Live Activity updates] → state changes only plus 15 s step coalescing; `NSSupportsLiveActivitiesFrequentUpdates` on.
- [The widget extension needs the App Group and push entitlement in the provisioning profile] → automatic signing with `-allowProvisioningUpdates` (already used by `make install-ios`) registers them.
- [Mixed languages] when the daemon and the app use different languages, pushes follow the daemon's language, as notifications already do.
- [Without Firebase] (no service account) only the local updates while the app is open work; the activity goes stale otherwise.
