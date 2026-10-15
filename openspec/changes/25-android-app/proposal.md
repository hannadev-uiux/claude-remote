## Why

The app only targets iOS: the Android native config, push channel, store links and texts assume an iPhone. Android users of Claude Code cannot follow their sessions. (Issue #11)

## What Changes

- **Android build** of the Expo app: `android` section in `app.config.ts` (package `tech.doctorx.clauderemote`, same id as iOS, adaptive icon from the existing icon, permissions limited to camera/notifications/internet, edge-to-edge, `softwareKeyboardLayoutMode`), scripts `android` / `build:android`, EAS profile.
- **Push on Android** through FCM with the same Firebase project: `google-services.json` next to `app.config.ts` when present (gitignored, like `GoogleService-Info.plist`), `POST_NOTIFICATIONS` permission request (Android 13+), a `claude-remote` notification channel; the daemon sends an `android` block (high priority, channel id) alongside `apns`. `device.register` gains an optional `platform` (`ios`/`android`). Push still never carries session content.
- **Platform-aware UI**: hardware back button (closes sheets/modals before navigating), "phone" instead of "iPhone" in texts (three languages), Play Store link to Tailscale, keyboard and safe-area behavior, the raw terminal WebView, QR scanning, SecureStore and haptics verified on Android.
- **Docs**: README and setup guide cover Android.

## Capabilities

### New Capabilities
- `android-app`: the app on Android (build, push, platform-specific behavior).

### Modified Capabilities

## Impact

`apps/mobile` (config, push, UI, texts), `packages/protocol` (`device.register.platform`), `apps/daemon` (push payload), README. Needs an Android development build (Android Studio/SDK or EAS).
