## Why

Voice dictation stops the moment the user pauses, because `useVoiceRecording` starts the native recognizer without `continuous: true`: the OS ends the session at the first silence, the `result` event fires as final, and whatever was said so far is inserted — so a longer prompt can't be dictated in one take. The transcript is also the raw recognizer output: no automatic punctuation, no cleanup of filler words or repetitions, unlike dictation in comparable apps. Issue #224 asks for continuous recording until the user stops, live interim feedback, and an optional pass that rewrites the dictation into a clean prompt.

## What Changes

- Recording keeps going across silences (`continuous: true`) until the user stops it, pauses it, or a 10-minute cap is reached; interim results are shown live while recording.
- New **pause/resume**: pausing finalizes the current segment and stops listening without closing the overlay; resuming starts listening again and the final transcript is every segment joined in order.
- An iOS audio interruption (call, Siri, alarm) no longer discards the recording: it finalizes the segment in progress and leaves the overlay paused, ready to resume.
- New **push-to-talk** mode, off by default: a Settings toggle switches the microphone button from tap-to-toggle to press-and-hold.
- On-device automatic punctuation (`addsPunctuation`) is enabled for every recording (no setting; strictly better than the raw output).
- New **"Polish dictation"** setting (off by default, Claude Code sessions only): when on, the finished transcript is sent to the daemon, which runs the connected profile's `claude` CLI once, non-interactively, in a scratch directory, with tool use disabled, to rewrite it (remove filler words and repetitions, fix punctuation and grammar, keep technical terms/file names/code as said). The rewrite is shown next to the original for the user to pick before it reaches the prompt field; any failure, timeout, or unsupported agent silently falls back to the original with no extra step.
- **BREAKING** (internal only): `useVoiceRecording`'s return shape changes (new `pause`/`resume`/review fields) and `AgentAdapter` gains a `polish` field; both are internal APIs with no external consumers.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `voice-input`: continuous recording, interim results, pause/resume, push-to-talk, automatic punctuation, the audio-interruption behavior, and the new "Polish dictation" rewrite step and setting.

## Impact

- `apps/mobile/src/features/voice/`: `use-voice-recording.ts` (continuous/segments/pause/resume/interruption/max duration), `error-outcome.ts` (new `interrupted` outcome), new `segments.ts` and `review.ts` pure modules with tests, `components/RecordingOverlay.tsx` (interim text, paused state, review step), `components/VoiceButton.tsx` (push-to-talk), new `voice-polish-store.ts` and `voice-interaction-store.ts` (settings), `components/VoiceLanguageCard.tsx` or a new settings card for the two new toggles.
- `apps/mobile/src/features/autocomplete/SmartComposer.tsx`: wires the new hook fields.
- `packages/protocol/src/{client,server}.ts`: new `voice.polish` request / `voice.polish.result` response.
- `apps/daemon/src/features/agents/types.ts,claude.ts,codex.ts`: new `polish` adapter field (Claude Code only).
- `apps/daemon/src/features/voice-polish/` (new): `service.ts` + `index.ts` registering the `voice.polish` handler, reusing `ctx.exec`, `agentFor`, and `isDefaultConfigDir`.
- i18n: new strings in pt-BR, en-US, es-ES (interim/paused/review UI, two new settings rows).
- No changes to the on-device transcription language setting or its storage.
