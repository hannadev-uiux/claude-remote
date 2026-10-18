## Why

Change 37 added the push relay, so a daemon without a Firebase service account can already send pushes through the app build's relay. What is still missing to make notifications "just work" (#58): the user cannot tell which mode is active or whether push works at all, there is no way to send a test, `doctor` says nothing useful, and there is no explicit way to turn push off. The spec still says a daemon without Firebase sends no push.

## What Changes

- **Push mode.** The daemon resolves one mode at start: `firebase` (service account file, the override), `relay` (default: the phones' relay grants) or `off` (new config `push: "off"`). `remote-harness push on|off` writes the config and applies it to the running daemon without a restart; `off` also stops live status updates.
- **Visibility.**
  - `auth.ok` reports `push: { mode }`.
  - The app gets a **Notifications** card in Settings: the daemon's mode (built-in relay / custom Firebase / off), this phone's state (permission, registered, relay grant) and a hint when something is missing. It has a **Send test notification** button and, when the permission was denied, a button to open the system settings.
  - `remote-harness doctor` prints the mode and how many phones can receive pushes. `remote-harness push status` prints the same.
- **Test notification.**
  - The app sends `push.test { fcmToken }` and the daemon sends a content-free test push to that phone only (even with the app in the foreground, where the app shows its banner). It answers `push.testResult` (`sent`, `off`, `unregistered`, `failed`).
  - `remote-harness push test` sends one to every registered phone.
- **Defaults on.** The app keeps asking for notification permission right after pairing (first connection), with every event type enabled. Mute controls stay the way to silence them.
- README: what the relay sees (sealed grant, generic title, profile name, identifiers), and the opt-out.
- Texts in pt-BR, en-US and es-ES (app, CLI, push).

## Capabilities

### New Capabilities

### Modified Capabilities
- `push-notifications`: delivery falls back to the relay, explicit opt-out, mode visibility and test notification.

## Impact

- `packages/protocol`: `PushModeSchema`, `auth.ok.push`, `push.test`, `push.testResult`.
- `apps/daemon`:
  - `features/push`: switchable sender, mode, test, admin routes.
  - Config `push`, CLI `push` command, `doctor`, i18n.
- `apps/mobile`: push state store, pure summary logic with tests, `PushCard`, test banner in the foreground, catalogs.
- The relay and the app build pipeline are unchanged. Shipping the official builds with the project's Firebase files and relay URL is a release step, not code.
