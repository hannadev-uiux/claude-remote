## Context

The app is built locally or with EAS internal distribution; there is no store release yet. `hello` already carries `daemonVersion` and `protocolVersion`. Expo SDK 57 supports `expo-updates` with EAS Update and with self-hosted servers that implement the Expo Updates protocol.

## Goals / Non-Goals

**Goals:** JS-only changes reach installed apps in minutes; an update never breaks a binary with different native code; the user always knows which versions are running and what to update.

**Non-Goals:** store publishing; updating native code over the air (impossible by design); forcing updates.

## Decisions

- **EAS Update first.** Hosting, CDN and channel management for free at this scale, and works anywhere (not only on the Tailscale network). Alternative kept open: a self-hosted server implementing the Expo Updates protocol (e.g. served by maarkn.dev), if depending on Expo becomes a problem. The app code (`src/core/updates`) only depends on `expo-updates`, so switching the URL does not change it.
- **Fingerprint runtime version** (`runtimeVersion: { policy: 'fingerprint' }`): computed from native dependencies and config, so adding a native module produces a new runtime and old binaries ignore the update instead of crashing.
- **Code signing** of update manifests (`updates.codeSigningCertificate`, key kept out of the repo) so a compromised update host cannot push code to the phones. The app has the daemon token, so this matters.
- **Apply on cold start by default.** `checkForUpdateAsync` + `fetchUpdateAsync` in the background; `reloadAsync` only from the Settings button, after confirmation, and never while a permission sheet is open or the composer has text.
- **Throttle**: last check time in storage; foreground checks at most every 30 minutes; failures are silent (logged) since the app works offline from the internet as long as Tailscale is up.
- **Daemon compatibility**: `MIN_DAEMON_VERSION` in `@claude-remote/protocol`; the app compares semver with `hello.daemonVersion` and shows a dismissible banner with `claude-remote update`. Protocol breaking changes still use `protocolVersion`.
- **Development builds** keep `expo-updates` disabled (`updates.enabled` false for the `development` profile) so Metro keeps working.

## Risks / Trade-offs

- Needs an Expo account and project id → documented; without them, the build simply has updates disabled.
- An update with a bug reaches every phone quickly → publish to `preview` first; `expo-updates` falls back to the embedded bundle if the update crashes at launch (error recovery).
- Fingerprint changes when native config changes → those releases require a new build, which the app explains.

## Open Questions

- EAS Update vs. self-hosted from the start.
- Whether to show a small "update ready, restart" toast besides Settings.
