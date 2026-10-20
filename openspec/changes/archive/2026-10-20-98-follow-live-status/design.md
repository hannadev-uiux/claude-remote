## Context

The app starts a live status in `use-live-status.ts` when, in the foreground, it sees a session turn `running`. It sends `live.register` with the FCM token, the iOS activity token, an optional relay grant and the palette. `LiveStatusService` (daemon) keeps registrations in memory and pushes updates through FCM, or through the relay when there is no service account. The relay replaces `apns.liveActivityToken` with the token sealed in the grant. `expo-widgets` exposes the push-to-start token (`addPushToStartTokenListener`) and lists every activity of the app (`getInstances`), including those iOS started from a push. It does not expose an activity's attributes, where our deep link `claude-remote://session/<id>` lives.

## Goals / Non-Goals

**Goals:**
- Opt a session in from the phone; desktop turns start the live status in the background.
- Follows survive daemon restarts and end by themselves (session ended, 12 h idle).
- No second activity for the same session; mute and the "Live status" setting still win.

**Non-Goals:**
- Updating an activity started by push before the app ever ran: without its update token the activity shows working until it goes stale (30 min). The next app launch adopts it.
- Following from a phone other than the one that taps Follow: follows are per phone (FCM token).

## Decisions

- **Follows are per phone and persisted by the daemon.** `live-follows.json` holds devices keyed by FCM token. Each device has the delivery data (platform, relay, push-to-start token and its relay grant, palette, `androidDataMessages`), the followed sessions with `lastTurnAt`, and the auto-follow profiles. Writes are atomic. The app re-sends `live.follows` on every connect, which refreshes the tokens and returns the list. The app keeps a local copy only to draw the marks.
- **When the daemon starts a live status.** On `UserPromptSubmit` of a followed session, `shouldStartFollowed` (pure) decides. It needs: no live registration for the session, no foreground client (the app in front starts its own, so there is never a second activity), not muted, and the follow not expired. Then, per device:
  - Android → `service.register(...)` with the device's data, as if the app had registered. The service sends the update right away.
  - iOS with a push-to-start token → `sendLive` with event `start` (`buildLiveMessage`). The payload carries `attributes-type: LiveActivityAttributes`, `attributes: { url }`, the `content-state` and an alert naming the session. The service also tracks the session as **awaiting activity**: it follows the state, but sends nothing until the app registers the activity's token, which replaces the entry and keeps the status.
  - iOS without a push-to-start token → a regular push like the other notifications: "Session working" as title, the profile name as body, `data.sessionId`.
- **Expiry.** `lastTurnAt` is set on follow and on every turn. `followExpired(lastTurnAt, now)` holds after 12 h. A sweep every 10 minutes drops expired follows, and so do the session ending (`justEnded`) and `SessionEnd`. Following an ended session is refused (`not_found`).
- **Auto-follow.** On a session's first appearance in the store (no previous), each device with its profile in `autoFollowProfiles` follows it.
- **Adopting a push-started activity.** A small `expo-widgets` patch adds `LiveActivity.getUrl()`. `reconcileActivities` gains `followedOrphans`: an alive activity that no saved record names, whose URL names a followed session that is working or waiting and has no activity yet, is adopted (and registered) instead of ended. `sessionIdFromActivityUrl` is pure and tested.
- **Push-to-start token.** The app listens with `addPushToStartTokenListener` (iOS 17.2+) and keeps the token in memory. It sends the token with the device data in every follow message, sealed in its own relay grant (`relayFor({ fcmToken, platform, activityToken: startToken })`). The relay needs no change.
- **App UI.** `useFollowedSessions` (zustand) holds `sessionIds` and `autoFollowProfiles` from the last `live.followed`. Follow / Stop following appear when the daemon announces `live.follow` and "Live status" is on: in the session menu and in the action sheet. The row and the header show a small `Radio` icon in `accentText` with an accessible label. Turning "Live status" off sends `live.unfollow` for each followed session and `live.autoFollow` off for each profile.

## Risks / Trade-offs

- [iOS may not wake the app after a push-to-start] → the activity still shows the session working with a running timer; it goes stale after 30 minutes, and the next launch adopts it and resumes updates.
- [The `expo-widgets` patch is native] → it adds one read-only function and keeps the rest; older builds lack `getUrl`, so the app checks that it exists and falls back to ending orphans as before.
- [Several phones follow the same session] → each gets its own start; live registrations stay one per session (the latest wins, as today).
