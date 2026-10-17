## Why

The app is installed as a local build (`expo run`, Xcode or an EAS internal build), so every JavaScript change needs a new build on each phone. The daemon updates with `claude-remote update` (change 26); the app should update the same way, without a computer and a cable. (Issue #20)

## What Changes

- **Over-the-air updates with `expo-updates`** (EAS Update): JavaScript and asset changes reach installed apps without a rebuild. One channel per build profile (`development`, `preview`, `production`). `runtimeVersion` uses the **fingerprint** policy, so an update only lands on binaries with the same native code.
- **When**: the app checks at launch and when it returns to the foreground (at most every 30 min), downloads in the background and applies it on the next cold start. **Settings → Check for updates** checks now and offers to restart. The app never reloads by itself while a permission request is open or text is being typed.
- **Settings** shows the app version, runtime version, update id and date, and the daemon version.
- **Compatibility with the daemon**: the daemon announces its version in `hello` (already does) and the app declares the minimum daemon version it needs. When the daemon is older, a banner suggests `claude-remote update` on the computer. When an update needs native code the binary does not have, the app says a new build is needed (no OTA).
- **Release flow**: `pnpm --filter @remote-harness/mobile ota:publish` publishes signed updates to the self-hosted server on maarkn.dev (maarkN/maarkn.dev#4), documented in README/CONTRIBUTING.
- **Channels** `production` (builds) and `development` (published by CI on every merge into `development`), switchable in Settings (issue #33).
- Texts in pt-BR, en-US and es-ES.

## Capabilities

### New Capabilities
- `app-updates`: over-the-air updates of the app and compatibility with the daemon version.

### Modified Capabilities

## Impact

`apps/mobile` (`expo-updates`, `app.config.ts` `updates`/`runtimeVersion`, `eas.json` channels, `src/core/updates`, Settings, banner), `packages/protocol` (minimum daemon version constant), README/CONTRIBUTING. Needs an Expo account and EAS project id (`extra.eas.projectId`), and a new native build once to include `expo-updates`.
