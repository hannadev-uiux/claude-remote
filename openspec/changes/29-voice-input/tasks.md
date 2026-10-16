## 1. Dependency and permissions

- [x] 1.1 Added `expo-speech-recognition@57.1.1` with `npx expo install`; resolves cleanly for the project's Expo SDK 57, typecheck green
- [x] 1.2 In `apps/mobile/app.config.ts`: added the `expo-speech-recognition` plugin; added `NSMicrophoneUsageDescription`/`NSSpeechRecognitionUsageDescription` to `SYSTEM_PROMPTS` (English base plus `pt-BR`/`es`); passed the same `NSMicrophoneUsageDescription` text explicitly to both `expo-camera`'s `microphonePermission` option (replacing `false`) and `expo-speech-recognition`'s `microphonePermission` option; removed `android.permission.RECORD_AUDIO` from `ANDROID_BLOCKED_PERMISSIONS`. Verified with `npx expo prebuild --clean` on both platforms and inspecting the generated files: `Info.plist` and all three `.lproj/InfoPlist.strings` have both keys with the correct localized text; `AndroidManifest.xml` has `RECORD_AUDIO` and the `RecognitionService` query intent

## 2. Voice module core

- [x] 2.1 Created `src/features/voice` with pure helpers: `volumeToLevel` (volumechange value → 0-1 meter level), `formatElapsed` (elapsed ms → "0:07" clock), `classifyRecognitionError` (error code → denied/offline-unavailable/retry), `insertTranscriptAtCursor` (insert transcript at the cursor with a separating space). No separate locale-mapping helper was needed: the app's `Locale` type (`pt-BR`/`en-US`/`es-ES`) is already the exact BCP-47 tag the module's `lang` option expects, so `currentLocale()` is passed straight through. All four verified with Vitest tests covering boundary values (17 tests)
- [x] 2.2 Created `useVoiceRecording()` wrapping `expo-speech-recognition`: state `idle`/`recording`/`transcribing`/`denied`/`offline-unavailable` (one more than originally planned — see design.md's Risks mitigation for `language-not-supported`), `start()`/`stop()`/`cancel()`/`retryOnline()`, live level and elapsed time (200ms interval), final transcript via the `result` event. Requests combined mic+speech-recognition permission on `start()` via `requestPermissionsAsync()`; `stop()` uses the module's `stop()` (finalizes with a result), `cancel()` uses `abort()` (no result, prompt field untouched). Verified with typecheck (react-native-touching, outside this project's Vitest convention)

## 3. Composer UI

- [x] 3.1 Created `RecordingOverlay` (level meter bar, elapsed timer, Cancel/Done) plus the `denied`/`offline-unavailable` message states (the latter offers Cancel/"Send online" instead of silently going online); typecheck green, visual check in the simulator still pending (see closing note)
- [x] 3.2 Added a `voiceButton` slot to `PromptComposer` (between the input and the send button) and a `VoiceButton` component (Mic/Square icon by state) wired into `SmartComposer` via `useVoiceRecording`; disabled under the same `disabled` prop as the text field. Transcript insertion reuses `SmartComposer`'s existing `insert()` (same mechanism as suggestion picks). Typecheck/tests green — manually recording/editing/sending still pending
- [x] 3.3 `denied` state renders `t('voice.permissionDenied')` instead of the recording controls, via `RecordingOverlay`; manual check with permission denied in the simulator's privacy settings still pending

## 4. Localization

- [x] 4.1 Added `voice.start`/`stop`/`cancel`/`done`/`permissionDenied`/`offlineUnavailable`/`retryOnline` to `pt-BR`, `en-US` and `es-ES` catalogs; i18n parity tests green (`pnpm --filter mobile test`)

## 5. Final verification

- [x] 5.1 `pnpm check` green (typecheck + tests + Biome) across the monorepo
- [x] 5.2 `expo prebuild --clean` on both platforms, inspected the generated files (task 1.2), then a real `xcodebuild -sdk iphonesimulator build` (`** BUILD SUCCEEDED **`) **and** a real Android `./gradlew assembleDebug` (`BUILD SUCCESSFUL`) — both platforms' native builds confirmed to compile with the voice-input plugin and `expo-speech-recognition`'s native module, no warnings tied to this change
- [x] 5.3 Real device build installed by the user (`make install-ios`, after pinning `APPLE_TEAM_ID` — several Apple teams were on the build Mac); confirmed the feature is reachable. Running every specific scenario (cancel, permission denial, each language) by hand is still open-ended, not a one-time checkbox

## 6. Transcription language setting

- [x] 6.1 Created `src/features/voice/language.ts`: `VoiceLanguage` (`'app' | Locale`), `isVoiceLanguage`, `resolveVoiceLanguage` (pure, tested) plus `restoreVoiceLanguage()`/`setVoiceLanguage()` (`SecureStore`-persisted, mirroring `core/updates/updates.ts`'s channel storage) and a small Zustand store for the Settings UI
- [x] 6.2 `useVoiceRecording` now calls `resolveVoiceLanguage()` instead of `currentLocale()` directly when starting a recording (both the normal `start()` and the online `retryOnline()` path)
- [x] 6.3 Created `VoiceLanguageCard` in Settings (chips: "same as the app", pt-BR, en-US, es-ES via `LOCALE_NAMES` from `@claude-remote/protocol`, matching `AppUpdatesCard`'s channel-picker pattern); wired into `app/(main)/settings.tsx`
- [x] 6.4 Added `voice.languageTitle`/`languageHint`/`languageApp` to all three catalogs; i18n parity tests green
- [ ] 6.5 Manual check: set the app to one language, the transcription language to another, record, and confirm the transcript comes back in the transcription language, not the app's
