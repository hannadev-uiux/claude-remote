## 1. Protocol and daemon

- [x] 1.1 Optional `platform` in `device.register`, stored with the device; `android` block in the push payload; verify with tests

## 2. App

- [x] 2.1 Android config (package, adaptive icon, permissions, keyboard, edge-to-edge), scripts and EAS profile; verify with `npx expo config --type public` and `npx expo export --platform android`
- [x] 2.2 FCM on Android: `google-services.json` when present, notification permission, channel, `platform` in the register; verify with tests for pure parts
- [x] 2.3 Back button handling, platform-neutral texts and store links (three languages); verify with tests and typecheck
- [ ] 2.4 Manual check on an Android emulator (pairing, list, conversation, terminal, permissions)

## 3. Docs

- [x] 3.1 README and setup guide for Android
