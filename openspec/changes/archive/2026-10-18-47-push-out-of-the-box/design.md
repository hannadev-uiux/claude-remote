## Context

`registerPushFeature` picks `createFirebaseSender(serviceAccount) ?? createRelaySender()` once; `PushService` and the live status feature share that sender. The app asks for permission and registers its token (with a relay grant when the build has `REMOTE_HARNESS_PUSH_RELAY_URL`) on every connection. Nothing reports which path is in use.

## Goals / Non-Goals

**Goals:** make the active mode visible on the phone and on the computer, a one-tap end-to-end test, an explicit opt-out that applies without restarting.

**Non-Goals:** changing the relay or its authentication (change 37); adding Firebase files to the repository (they stay gitignored and are provided by whoever builds the official app); per-event toggles (mute already covers it).

## Decisions

- **Mode resolution** (pure `resolvePushMode({ setting, hasServiceAccount })`): `off` when the config says `"off"`, else `firebase` when the service account file exists, else `relay`. The config key is `push: "auto" | "off"` (default `auto`), so the override (service account) stays a file drop as today.
- **Switchable sender.** `SwitchablePushSender` implements `PushSender` and delegates to the current inner sender; `off` makes `send`/`sendLive` no-ops. Both `PushService` and the live status feature get it, so one switch turns everything off. `POST /admin/push-mode` (hooks server, secret) re-reads the config and swaps the inner sender; the Firebase sender is created once and cached.
- **Test push.** `push.test { fcmToken }` sends only to the registered device with that token, skipping the foreground and mute checks (the user asked for it). The payload is the usual shape: a generic title, the computer's name as body, `event: "test"`. The app's notification handler shows a banner in the foreground only for `event: "test"`. `POST /admin/push-test` (CLI) sends to every registered phone and returns how many were sent.
- **Result codes:** `off` (mode off), `unregistered` (token unknown: permission missing or the app has not registered yet), `failed` (sender threw or FCM said the token is invalid; an invalid token is removed), `sent`.
- **App state.** `use-push` records what it learns in a small store: `firebase` (build has Firebase), `permission` (`granted`/`denied`/`unknown`), `token`, `relay` (grant obtained). Pure `pushSummary(daemonMode, phone)` returns the status key and hint shown in the card:
  - build without Firebase → "this build has no push";
  - permission denied → "turn on notifications in Settings" (button opens them);
  - relay mode but no grant → "this build has no relay; the daemon needs a Firebase service account";
  - otherwise ready.
- **Older daemons** omit `auth.ok.push`: the card shows the mode as unknown and hides the test button (the message would be `unknown_type`).
- **Doctor** prints `· push: <mode>` and the device count, with a hint when `relay` and no device has a grant.

## Risks / Trade-offs

- The relay mode depends on the app build carrying a relay URL; self-built apps without one need the service account (shown in the card and in `doctor`).
- A test push in the foreground relies on the app's notification handler; on Android FCM delivers data to the app in the foreground, which `expo-notifications` presents through the same handler.
