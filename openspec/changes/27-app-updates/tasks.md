## 1. Setup

- [x] 1.1 Decide EAS Update vs. self-hosted → self-hosted on maarkn.dev (maarkN/maarkn.dev#4); code-signing key generated with `expo-updates codesigning:generate`, kept outside the repo
- [x] 1.2 `npx expo install expo-updates`; `updates` from `CLAUDE_REMOTE_UPDATES_URL`/`EAS_PROJECT_ID` (off without them; code signing when `certs/certificate.pem` exists, required for a custom URL), `runtimeVersion` fingerprint, channels in `eas.json`; verified with `npx expo config` (off, EAS, custom URL without certificate refused), `expo export` and `expo-doctor`

## 2. App

- [x] 2.1 `src/core/updates` (check/fetch/apply, throttle, pure decision logic tested with Vitest)
- [x] 2.2 Settings: versions, "Check for updates", restart confirmation; texts in the three languages
- [x] 2.3 `MIN_DAEMON_VERSION` in the protocol and the outdated-daemon banner; tests for the version comparison

## 3. Release

- [x] 3.1 `ota:publish` (`scripts/publish-update.mts`: export, sign locally, upload missing files) with tests for the manifest builder; README and CONTRIBUTING
- [ ] 3.2 End-to-end on a device: publish an update, see it applied after a cold start; `pnpm check` and `openspec validate --strict`
  > Done on the iOS simulator (Release build, local maarkn.dev server): the published update was applied after a cold start, and an update signed with another key was rejected. Still pending on a real phone against maarkn.dev in production.
