## Context

The app is Expo (SDK with Expo Router, `@react-native-firebase/messaging`, `expo-camera`, `expo-secure-store`, `react-native-webview` for xterm). Most of it is cross-platform already; gaps are native config, push specifics, the back button and iPhone-specific texts/links.

## Goals / Non-Goals

**Goals:** feature parity on Android 10+ (API 29+); same daemon and protocol; push working through FCM.

**Non-Goals:** publishing to Google Play in this change; tablets/foldables layouts; Wear OS.

## Decisions

- **Package id** `tech.doctorx.clauderemote`, the same as the iOS bundle id.
- **google-services.json** used only when the file exists next to `app.config.ts` (gitignored), mirroring `GoogleService-Info.plist`; without it the app builds without push.
- **Notification channel** `claude-remote` (importance high) created at startup; the daemon payload sets `android.notification.channelId` and `android.priority = 'high'`; content stays generic.
- **Protocol**: `device.register` gets `platform: z.enum(['ios', 'android']).optional()` (backward compatible); stored with the device and shown by `doctor`.
- **Back button**: one `useBackHandler` hook in `src/core` used by sheets/modals.
- **Texts**: catalogs use "phone"/"celular"/"móvil" and the platform name where it matters (`Platform.OS`).

## Risks / Trade-offs

- No Android device in CI → typecheck, Vitest for pure logic and `npx expo export --platform android`; manual check on an emulator.
