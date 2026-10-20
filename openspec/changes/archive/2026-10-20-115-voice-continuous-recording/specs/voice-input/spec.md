## ADDED Requirements

### Requirement: Continuous recording until stopped
Recording SHALL continue across silences (the recognizer runs with `continuous` enabled) instead of ending automatically at the first pause, up to a 10-minute cap; reaching the cap SHALL stop and finalize the recording exactly as if the user had tapped stop. While recording, the overlay SHALL show the interim (not yet final) transcript live, in addition to the level meter and elapsed timer, so the user can see recognition is still active.

#### Scenario: Long pause mid-sentence
- **WHEN** the user pauses speaking for several seconds mid-recording and then keeps talking
- **THEN** recording keeps running and both halves end up in the final transcript

#### Scenario: Interim preview updates live
- **WHEN** the user is mid-sentence
- **THEN** the overlay's interim text updates as words are recognized, before the segment finalizes

#### Scenario: Maximum duration
- **WHEN** a single recording reaches 10 minutes
- **THEN** it stops and finalizes automatically, the same as tapping stop

### Requirement: Pause and resume
The recording overlay SHALL offer a Pause control while recording. Pausing SHALL stop listening and keep whatever was transcribed so far, without closing the overlay or discarding it; the overlay SHALL then offer Resume (continue listening, appending to the same transcript), Cancel (discard everything) and Done (finalize what has been transcribed so far). An iOS audio interruption (an incoming call, Siri, or an alarm) SHALL be treated the same as a manual pause: the segment in progress is kept and the overlay is left paused, never silently discarding the recording.

#### Scenario: Manual pause and resume
- **WHEN** the user records a sentence, taps Pause, taps Resume, and records another sentence
- **THEN** the final transcript contains both sentences in order

#### Scenario: Phone call interrupts recording
- **WHEN** a phone call arrives while recording
- **THEN** the overlay shows paused with what was transcribed before the call kept, and Resume continues the recording after the call ends

#### Scenario: Done while paused
- **WHEN** the user taps Done while paused
- **THEN** the transcript collected so far is finalized, same as stopping while recording

### Requirement: Polish dictation rewrite
Settings SHALL offer a "Polish dictation" toggle (off by default, noted as Claude Code sessions only). When on and the session's profile is a Claude Code profile without a model provider, finishing a recording SHALL send only the finalized transcript (never audio) to the daemon, which runs that profile's `claude` CLI once, non-interactively, with tool use disabled, outside any project directory, to rewrite the text: remove filler words, hesitations and repetitions, fix punctuation and grammar, and keep technical terms, file names and code exactly as said. When the rewrite differs from the original, the app SHALL show both for the user to choose from (Use original / Use polished) before anything is inserted into the prompt field. When the setting is off, the profile does not support it, the rewrite fails or times out, or the rewrite is identical to the original, the original transcript SHALL be inserted directly, with no extra step and no error shown to the user.

#### Scenario: Rewrite accepted
- **WHEN** "Polish dictation" is on, the session uses a Claude Code profile, and the rewrite differs from "so, um, let's, let's continue the tests okay"
- **THEN** the user sees both versions and picking "Use polished" inserts the rewritten text into the prompt field

#### Scenario: Unsupported profile falls back silently
- **WHEN** "Polish dictation" is on but the session's profile uses Codex or routes through a model provider
- **THEN** the original transcript is inserted directly, with no review step and no error

#### Scenario: Rewrite call fails or times out
- **WHEN** the daemon's `claude` call errors or does not return within its timeout
- **THEN** the original transcript is inserted directly, with no error shown to the user

#### Scenario: No audio or recording ever leaves the phone
- **WHEN** "Polish dictation" is on
- **THEN** only the finalized transcript text is sent to the daemon, never the recorded audio

## MODIFIED Requirements

### Requirement: Start and stop recording
The composer SHALL show a microphone button next to the send button. With push-to-talk off (the default), tapping it SHALL start recording and tapping it again SHALL stop it and begin finalizing the transcript. With push-to-talk on (a Settings toggle), pressing and holding the button SHALL record for as long as it is held, and releasing it SHALL stop and begin finalizing. In a read-only session the microphone button MUST be disabled, same as the text field.

#### Scenario: Start recording
- **WHEN** the user taps the microphone button
- **THEN** recording starts and the recording overlay appears

#### Scenario: Stop recording
- **WHEN** the user taps the microphone button again while recording
- **THEN** recording stops and the transcript is finalized

#### Scenario: Push-to-talk
- **WHEN** push-to-talk is on and the user presses and holds the microphone button for 3 seconds, then releases
- **THEN** recording runs for the held duration and stops the instant the button is released

#### Scenario: Read-only session
- **WHEN** the session is read-only (`controllable: false`)
- **THEN** the microphone button is disabled, like the text field

### Requirement: Cancel discards the recording
Canceling a recording, whether recording or paused, SHALL discard it without transcribing and without changing the prompt field's existing text.

#### Scenario: Cancel mid-recording
- **WHEN** the user taps Cancel while recording
- **THEN** the recording overlay closes, no transcript is inserted, and the prompt field is unchanged

#### Scenario: Cancel while paused
- **WHEN** the user taps Cancel while paused
- **THEN** the recording overlay closes and everything transcribed so far is discarded

### Requirement: On-device transcription fills the prompt
Finishing a recording SHALL transcribe it on-device, with automatic punctuation enabled, in the chosen transcription language (see "Transcription language setting"), and insert the result into the prompt field at the cursor position, exactly as if it had been typed; the user MUST be able to edit it before sending with the existing send button. The audio and the raw transcript MUST NOT be sent to the daemon or to any network service; the one exception is the opt-in "Polish dictation" rewrite (see that requirement), which sends only the already-produced text, never audio.

#### Scenario: Transcript fills the field
- **WHEN** the user records "continuar com os testes" with the transcription language set to pt-BR
- **THEN** the prompt field shows "continuar com os testes" and the existing send button sends it like typed text

#### Scenario: No network involved
- **WHEN** a recording is transcribed and "Polish dictation" is off
- **THEN** no `session.input` or other daemon request is made for the audio or the transcript, and no request reaches a third-party service
