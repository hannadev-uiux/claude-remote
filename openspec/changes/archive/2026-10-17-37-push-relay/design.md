## Context

`features/push` builds FCM messages (`buildMulticast`, `buildLiveMessage`) and sends them with `firebase-admin` when `~/.remote-harness/firebase-service-account.json` exists. The app registers its FCM token with `device.register` and, for live status, `live.register`.

## Goals / Non-Goals

**Goals:** pushes and live status for builds of the official app without any credential on users' computers; a daemon can only reach phones paired with it; cost bounded.

**Non-Goals:** relaying for builds with another bundle ID or package (APNs and `google-services.json` belong to one project); delivery receipts; a database of devices.

## Decisions

### Stateless grants instead of a device database
A grant is `base64url(iv | ciphertext | tag)` of `{ v: 1, t: fcmToken, p: platform, a?: activityToken, iat }`, sealed with AES-256-GCM under `GRANT_KEY` (32 random bytes in Secret Manager). The relay needs no storage. The daemon never sees the raw token in relay mode; it only holds grants, and the relay targets whatever token the grant contains. Rotating `GRANT_KEY` invalidates all grants; apps get new ones on their next registration (every connection).

### The daemon builds the FCM message, the relay only targets it
Keeping `buildMulticast` / `buildLiveMessage` in the daemon avoids two copies of the payload rules. The relay accepts a message with `data`, `notification`, `apns`, `android` (and nothing that picks a target), sets `token` from the grant and `apns.liveActivityToken` from the grant's activity token (removing any other value). The message is capped at 8 KB. The no-content rule stays enforced where the payload is built (the daemon), as today.

### App Check, switchable
`/grant` verifies `X-Firebase-AppCheck` with `getAppCheck().verifyToken`. With `APP_CHECK=enforce`, a missing or invalid token gets `401`; with `monitor` (default) it is logged and allowed. This lets the relay work before App Check is registered (DeviceCheck key on iOS, Play Integrity on Android, which needs the app in the Play Console). The app uses DeviceCheck instead of App Attest: no extra entitlement.

Without App Check, someone can mint grants for their own tokens and use the relay as a free push service; the rate limit and `maxInstances` bound the cost, and they still cannot reach other people's phones.

### One function, deployed from a generated folder
`pushRelay` is a single `onRequest` function routing `/grant` and `/send`. `pnpm build` bundles `src/index.ts` with esbuild (externals: `firebase-functions`, `firebase-admin`) into `deploy/index.js` and writes `deploy/package.json` with just those two dependencies, so Cloud Build runs a plain `npm install` without workspace references. `firebase.json` points `functions.source` to that folder with the build as `predeploy`.

### Relay URL from the app
The app is built with `REMOTE_HARNESS_PUSH_RELAY_URL` (in `extra.pushRelay`, like the updates URL) and sends `relay: { url, grant }` with each registration. The daemon then needs no configuration: it posts to `<url>/send` (HTTPS only). The paired app is already trusted by the daemon.

### Sender choice in the daemon
With a service account: the Firebase sender, as today (it ignores `relay`). Without one: the relay sender, which skips devices without `relay`. `send` and `sendLive` receive the device (token + relay) instead of a bare token. `410` from the relay means the token is gone.

### Rate limit
A token bucket per grant hash (30 requests, refilled at 1 per 2 s) inside each instance; with `maxInstances: 3` the effective limit is at most three times that. Good enough for a personal app; a shared store would be needed at larger scale.

## Risks / Trade-offs

- [Blaze plan required] → FCM is free and the function's free tier (2M invocations/month) covers personal use; budget alerts recommended.
- [Grant leak from a daemon's `devices.json`] → it allows pushing to that one phone until its FCM token changes; the file is `0600`, like the token today.
- [`monitor` mode allows abuse of the quota] → enable `enforce` once App Check is registered.
