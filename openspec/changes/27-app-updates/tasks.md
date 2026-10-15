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

## 4. Channels (issue #33)

- [x] 4.1 `metadata.channel` in the manifest and `--channel` in the publisher; `make publish-ota CHANNEL=…`; tests
- [x] 4.2 Channel selector in Settings (persisted, `setUpdateRequestHeadersOverride`, confirmation for development); texts in the three languages
- [x] 4.3 Server: channels, `expo-manifest-filters`, development-only token (maarkN/maarkn.dev#7, #9)
- [x] 4.4 CI workflow `ota-development.yml` (push to development, secrets `OTA_SIGNING_KEY` and `OTA_DEV_TOKEN`)
- [ ] 4.5 End to end: a merge into development reaches a phone on the development channel, and switching back to production works
  > Simulator (Release build, local maarkn.dev from main): production update running → switched to development (confirmation, download, restart) → development update running → back to production → the older production update was applied (manifest filters). The CI token was refused for production (403). Pending: the workflow in GitHub Actions with the real secrets, and a phone.
