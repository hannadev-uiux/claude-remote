## Why

Typing a prompt on a phone is slow, and the composer today has no way to dictate instead. Issue #40 asks for recording a voice message and transcribing it into the prompt, like dictation in Claude Code / claude.ai, so the user can talk instead of type and still edit the result before sending.

## What Changes

- New mic button in the composer (next to, not replacing, the existing send button — the WhatsApp-style "mic when empty, send when typing" redesign is issue #41's separate scope). Tapping it starts recording; tapping again (or Cancel) stops it.
- A recording overlay shows a live level meter and an elapsed timer while recording, with explicit Cancel and Done actions — no slide-to-cancel gesture, to keep the interaction simple and accessible (VoiceOver, external keyboard, Android back button).
- On-device speech recognition (`expo-speech-recognition`, wrapping iOS `SFSpeechRecognizer` and Android `SpeechRecognizer`) transcribes the recording with `requiresOnDeviceRecognition: true` whenever the device supports it; audio never leaves the phone and nothing is sent to the daemon or any cloud API. The recognition locale follows the app's current language (pt-BR/en-US/es-ES).
- The transcript fills the prompt field once recognition finishes, exactly like typed text: the user can still edit it before sending with the existing send button.
- New microphone and speech-recognition permission texts, localized in the three languages (same per-language `Info.plist` pattern already used for the camera and local-network prompts); `android.permission.RECORD_AUDIO`, blocked today, is allowed.

## Capabilities

### New Capabilities
- `voice-input`: recording a voice message in the composer and filling the prompt with its on-device transcript.

### Modified Capabilities

## Impact

- `apps/mobile/package.json`: new dependency `expo-speech-recognition`.
- `apps/mobile/app.config.ts`: add the `expo-speech-recognition` plugin; add `NSMicrophoneUsageDescription`/`NSSpeechRecognitionUsageDescription` (English base plus the three `locales` overrides, matching `SYSTEM_PROMPTS`); remove `android.permission.RECORD_AUDIO` from `ANDROID_BLOCKED_PERMISSIONS`; reconcile the `expo-camera` plugin's `microphonePermission: false` (today actively suppresses `NSMicrophoneUsageDescription`) with the new permission text.
- `apps/mobile/src/features/voice` (new): recording/transcription hook wrapping `expo-speech-recognition`, pure helpers (level mapping, locale mapping, timer formatting) with Vitest tests, mic button and recording overlay components.
- `apps/mobile/src/features/autocomplete/SmartComposer.tsx` and/or `apps/mobile/src/features/conversation/components/PromptComposer.tsx`: wire in the mic button and the recording overlay.
- `apps/mobile/src/core/i18n/locales/*`: new `voice.*` keys in all three catalogs.
- No daemon or protocol changes: this is entirely client-side.
