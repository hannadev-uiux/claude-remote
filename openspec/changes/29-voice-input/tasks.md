## 1. Dependency and permissions

- [ ] 1.1 Add `expo-speech-recognition` with `npx expo install`; verify it resolves for the project's Expo SDK and typecheck stays green
- [ ] 1.2 In `apps/mobile/app.config.ts`: add the `expo-speech-recognition` plugin; add `NSMicrophoneUsageDescription`/`NSSpeechRecognitionUsageDescription` to `SYSTEM_PROMPTS` (English base plus the `pt-BR`/`es` overrides already following that object's shape); pass the same `NSMicrophoneUsageDescription` text explicitly to both `expo-camera`'s `microphonePermission` option (replacing `false`) and `expo-speech-recognition`'s `microphonePermission` option, so the result does not depend on plugin order; remove `android.permission.RECORD_AUDIO` from `ANDROID_BLOCKED_PERMISSIONS`. Verify with `npx expo prebuild --clean` and inspect the generated `Info.plist` (both keys present, correct English text) and `AndroidManifest.xml` (`RECORD_AUDIO` present, `RecognitionService` query present)

## 2. Voice module core

- [ ] 2.1 Create `src/features/voice` with pure helpers: map a `volumechange` value to a 0-1 meter level, format the elapsed recording timer, map an app `Locale` to the recognition `lang` tag; verify with Vitest tests covering the boundary values
- [ ] 2.2 Create `useVoiceRecording()` hook wrapping `expo-speech-recognition`: exposes state (`idle`/`recording`/`transcribing`/`denied`), `start()`/`cancel()`/`stop()`, live level and elapsed time, and the final transcript; requests microphone + speech-recognition permission on first `start()` and surfaces denial as a distinct state rather than throwing; passes `requiresOnDeviceRecognition: true` and `lang: currentLocale()`. Verify with typecheck (the hook itself is a `react-native`-touching file, outside this project's Vitest convention)

## 3. Composer UI

- [ ] 3.1 Create a recording overlay component showing the live level meter, the elapsed timer, and Cancel/Done controls; verify with typecheck and a visual check in the simulator
- [ ] 3.2 Add a microphone button to `SmartComposer`/`PromptComposer` next to the existing send button, disabled under the same condition as the text field (read-only session); wire it to `useVoiceRecording()` and insert the final transcript into `prompt.text` at the cursor, the same way `SmartComposer`'s suggestion `insert()` already does; verify with typecheck and manually recording, editing the result, and sending it
- [ ] 3.3 On permission denial, show a message explaining recording is unavailable instead of opening the recording overlay; verify manually with microphone permission denied in the simulator's privacy settings

## 4. Localization

- [ ] 4.1 Add `voice.*` keys (mic button accessibility label, recording/listening label, permission-denied message) to `pt-BR`, `en-US` and `es-ES` catalogs; verify with the existing i18n parity tests (`pnpm --filter mobile test`)

## 5. Final verification

- [ ] 5.1 `pnpm check` green (typecheck + tests + Biome)
- [ ] 5.2 `expo prebuild --clean` plus a real `xcodebuild -sdk iphonesimulator build` to confirm the new plugin and permission wiring compile; note in the PR if an Android build was or was not also validated
- [ ] 5.3 Manual check on a real device or simulator: record → transcript fills the field → edit → send; cancel mid-recording leaves the field untouched; deny microphone permission and confirm the button shows the unavailable message instead of crashing; repeat with the app in all three languages to confirm the transcript locale follows the app language
