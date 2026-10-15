## 1. Setup

- [ ] 1.1 Decide EAS Update vs. self-hosted; create the EAS project (`extra.eas.projectId`) and the code-signing key (outside the repo)
- [ ] 1.2 `npx expo install expo-updates`; `updates` (url, code signing, disabled in development), `runtimeVersion` fingerprint, channels in `eas.json`; verify with `npx expo config` and a new native build

## 2. App

- [ ] 2.1 `src/core/updates` (check/fetch/apply, throttle, pure decision logic tested with Vitest)
- [ ] 2.2 Settings: versions, "Check for updates", restart confirmation; texts in the three languages
- [ ] 2.3 `MIN_DAEMON_VERSION` in the protocol and the outdated-daemon banner; tests for the version comparison

## 3. Release

- [ ] 3.1 `update:publish` script and docs (README, CONTRIBUTING: publish to `preview`, then `production`)
- [ ] 3.2 End-to-end on a device: publish an update, see it applied after a cold start; `pnpm check` and `openspec validate --strict`
