## Why

The live status (Live Activity on iOS, the ongoing notification on Android) only starts when the app is in the foreground and sees a session turn `running`, usually after a prompt sent from the phone. A session driven from the computer never gets one, even when the user wants to keep an eye on it away from the desk (#130).

## What Changes

- **Follow / Stop following** a session, from its More options menu and from the session list's action sheet (long press or the swipe's More). A followed session shows a small "following" mark on its row and in its header.
- **Following starts the live status right away** when the session is working or waiting. An idle session shows nothing until its next turn.
- **Later turns started on the computer** start (or restart) the live status even with the app in the background or closed:
  - **Android**: the daemon starts the app-drawn notification itself (data messages, as today).
  - **iOS 17.2+**: the daemon starts a Live Activity with a **push-to-start** token that the app registers. When the app next runs (iOS wakes it for the new activity, or the user opens it), it adopts the activity and registers its update token as usual.
  - **Older iOS / no token yet**: a regular push "Session working" with the profile name.
- A session stays followed until **Stop following**, until it **ends**, or after **12 hours without a turn**. Mute still wins: a muted session or profile gets no live status. Turning "Live status" off stops following everything.
- **Auto-follow per profile**: a switch in the profile's details sheet ("Follow new sessions", off by default). New sessions of that profile are followed on this phone.
- **Protocol**: `live.follow`, `live.unfollow`, `live.autoFollow` and `live.follows`, all replied with `live.followed { sessionIds, autoFollowProfiles }`. `auth.ok` gains `live: { follow: true }`. The daemon persists the follows per phone in `live-follows.json`, so they survive restarts.
- **Same privacy rule**: the push-to-start payload is the live status props (session title and folder allowed). The fallback push is like the other notifications (state and profile name).

## Capabilities

### New Capabilities

### Modified Capabilities
- `live-status`: Follow a session; follow protocol; auto-follow (the switch in the profile's details sheet); adopting an activity started by push.

## Impact

- `packages/protocol`: the new messages, `LiveFollowDeviceSchema`, `auth.ok.live`.
- `apps/daemon/src/features/live-status/`: `follows.ts` (pure rules: timeout, who to start; store with atomic writes, tests), `index.ts` (triggers on `UserPromptSubmit`, session end, new sessions, sweep), `service.ts` (an entry that waits for the activity token sends nothing), `push/sender.ts` (push-to-start in `buildLiveMessage`, tests), daemon i18n.
- `apps/mobile/src/features/live-status/`: `follow-store.ts`, `use-live-follow.ts` (sync with the daemon, tokens), `use-live-status.ts` (adopt push-started activities by their deep link), `logic.ts` (`sessionIdFromActivityUrl`, tests); session menu, action sheet, row and header mark; profile sheet switch; i18n.
- `patches/expo-widgets@57.0.26.patch`: `LiveActivity.getUrl()` (the deep link the activity was started with). Native: needs a new iOS build.
- No change to the push relay: a grant that seals the push-to-start token targets it like any activity token.
