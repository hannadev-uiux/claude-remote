## Why

While Claude Code works on a long turn, the user has to open the app to know whether it is still running, waiting for them or done (issue #54). A live status on the lock screen, like a delivery tracker, answers that at a glance: a Live Activity with the Dynamic Island on iOS, and a persistent progress notification on Android.

## What Changes

- **iOS Live Activity** (`expo-widgets`, ActivityKit): the lock screen banner and the Dynamic Island (compact, minimal, expanded) show the profile name, the state (working → waiting for you → done / session closed), the current step as a category ("running a command", "editing files", …), the tool count and a live elapsed timer. Tapping it opens the session. On iPad it shows on the lock screen only (system behavior).
- **Android**: a silent notification on a low-importance "Live status" channel, one per session (same `tag`, replaced on each update), with the same texts. Tapping opens the session.
- **When it starts**: the app starts the live status when a session it knows turns `running` while the app is open (typically right after sending a prompt from the phone), unless the session or its profile is muted or "Live status" is off in Settings (on by default). The app registers it with the daemon (`live.register`, with the FCM token and, on iOS, the activity push token).
- **Updates**: the daemon updates it through FCM (`apns.liveActivityToken` on iOS, a tagged notification on Android), from what it already knows: hooks (`UserPromptSubmit`, `PermissionRequest`/resolution, `Notification`, `Stop`, `SessionEnd`) for the state, and the session transcript it follows while registered for the step and tool count. State changes go out at once; step-only changes at most every 15 s. On `Stop` it turns into "done" and is dismissed after 15 minutes; on `SessionEnd` it ends. While the app is open on iOS it also updates the activity locally from the session state.
- **Content rule**: like every push, live status payloads never carry session content. Allowed: the profile name, the state, a fixed step category derived from the tool name (never its input or output), the tool count and timestamps. The session title is not sent (it may come from the conversation).
- Mute is respected: muting a live session ends its live status.
- Texts in pt-BR, en-US and es-ES (the daemon builds push texts in its configured language, the app in its own).

## Capabilities

### New Capabilities
- `live-status`: live status of running sessions on the lock screen (iOS Live Activity / Dynamic Island, Android notification).

### Modified Capabilities

## Impact

- `packages/protocol`: `live.register` / `live.unregister` client messages, `LiveStatusProps` (shared with the widget).
- `apps/daemon`: new `features/live-status` (registry, pure state reducer, throttling, FCM payloads), `TranscriptService.follow` for internal listeners, `PushSender.sendLive`, push texts in the three catalogs.
- `apps/mobile`: `expo-widgets` + `@expo/ui` (new native code: widget extension target, App Group, push entitlement), `features/live-status` (widget layout, start/update logic, Settings toggle), Android "Live status" channel, i18n. **Needs a new app build**; OTA updates cannot add it.
- Remote start of activities (push-to-start, for sessions started on the computer while the app is closed) is out of scope.
