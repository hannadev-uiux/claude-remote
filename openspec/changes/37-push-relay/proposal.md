## Why

Pushes and live status updates need a Firebase service account on every computer that runs the daemon (issue #112). That credential can send to every phone registered in the project, so the Firebase project of the official builds cannot be shared with other users. A relay that keeps the credential server-side lets every daemon paired with an official build send pushes, without distributing it.

## What Changes

- **New `apps/push-relay`**: one HTTPS Cloud Function (2nd gen, `southamerica-east1`) with two routes:
  - `POST /grant`: the app sends its FCM token, platform and optional Live Activity token, plus an App Check token in `X-Firebase-AppCheck`. The relay answers with a grant: the tokens sealed with AES-256-GCM under a secret (`GRANT_KEY`, in Secret Manager). App Check is enforced or only logged, depending on the `APP_CHECK` parameter (`monitor` by default until App Check is registered for both apps).
  - `POST /send`: the daemon sends a grant and an FCM message. The relay opens the grant, overrides the target (`token`, and `apns.liveActivityToken` with the grant's activity token), rejects `topic`/`condition`/`tokens`, limits the size, and sends with the project's default credentials. An unregistered token answers `410`, so the daemon drops it.
  - Per-grant rate limit (best effort, per instance) and `maxInstances` to bound cost.
- **Protocol**: `device.register` and `live.register` take an optional `relay: { url, grant }`. Older daemons ignore it.
- **Daemon**: when no local service account exists, a relay sender posts each message to `<url>/send` with the device's grant. Self-hosted Firebase (service account file) keeps working and takes precedence. The device registry stores the relay data with the token.
- **App**: the relay URL comes from the build (`REMOTE_HARNESS_PUSH_RELAY_URL`). After getting the FCM token (and the activity token), the app asks for a grant, with an App Check token when available (`@react-native-firebase/app-check`: DeviceCheck on iOS, Play Integrity on Android, debug provider in development builds), and passes `relay` to the daemon.
- **Deploy**: `firebase.json` at the root, `make deploy-push-relay PROJECT=<id>`; README documents both modes.

## Capabilities

### New Capabilities
- `push-relay`: relay that sends FCM messages for daemons without a service account, scoped by grants.

### Modified Capabilities

## Impact

New `apps/push-relay` package (firebase-functions, firebase-admin, esbuild bundle into a deploy folder so Cloud Build never sees workspace dependencies). `packages/protocol`, `apps/daemon` (`features/push`, `features/live-status`), `apps/mobile` (push and live status registration, new native module `@react-native-firebase/app-check`, so a new build). Requires the Blaze plan on the Firebase project.
