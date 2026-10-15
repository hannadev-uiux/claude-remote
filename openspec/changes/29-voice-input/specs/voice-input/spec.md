## Purpose
Lets the user record a voice message in the composer and have it transcribed on-device into the prompt field, instead of typing.

## ADDED Requirements

### Requirement: Start and stop recording
The composer SHALL show a microphone button next to the send button. Tapping it SHALL start recording; tapping it again SHALL stop recording and begin transcription. In a read-only session the microphone button MUST be disabled, same as the text field.

#### Scenario: Start recording
- **WHEN** the user taps the microphone button
- **THEN** recording starts and the recording overlay appears

#### Scenario: Stop recording
- **WHEN** the user taps the microphone button again while recording
- **THEN** recording stops and transcription begins

#### Scenario: Read-only session
- **WHEN** the session is read-only (`controllable: false`)
- **THEN** the microphone button is disabled, like the text field

### Requirement: Recording feedback
While recording, the app SHALL show a live audio level meter and an elapsed timer, plus explicit Cancel and Done controls.

#### Scenario: Level meter follows volume
- **WHEN** the user speaks louder
- **THEN** the level meter's visual intensity increases

#### Scenario: Timer counts up
- **WHEN** recording has been running for a few seconds
- **THEN** the displayed elapsed time keeps counting up

### Requirement: Cancel discards the recording
Canceling a recording SHALL discard it without transcribing and without changing the prompt field's existing text.

#### Scenario: Cancel mid-recording
- **WHEN** the user taps Cancel while recording
- **THEN** the recording overlay closes, no transcription happens, and the prompt field is unchanged

### Requirement: On-device transcription fills the prompt
Finishing a recording SHALL transcribe it on-device, in the app's current language, and insert the result into the prompt field at the cursor position, exactly as if it had been typed; the user MUST be able to edit it before sending with the existing send button. The audio and its transcript MUST NOT be sent to the daemon or to any network service.

#### Scenario: Transcript fills the field
- **WHEN** the user records "continuar com os testes" with the app in pt-BR
- **THEN** the prompt field shows "continuar com os testes" and the existing send button sends it like typed text

#### Scenario: Matches the app language
- **WHEN** the app's current language is es-ES
- **THEN** transcription is requested in es-ES, not the device's own system language if it differs

#### Scenario: No network involved
- **WHEN** a recording is transcribed
- **THEN** no `session.input` or other daemon request is made for the audio itself, and no request reaches a third-party service

### Requirement: Microphone permission
Before the first recording, the app SHALL request microphone and speech-recognition permission with localized explanations. If permission is denied, the app SHALL show a message explaining recording is unavailable, without crashing.

#### Scenario: First use
- **WHEN** the user taps the microphone button for the first time
- **THEN** the system permission prompts appear with the app's localized explanation text

#### Scenario: Permission denied
- **WHEN** the user has denied microphone permission
- **THEN** tapping the microphone button shows a message explaining recording is unavailable, instead of starting a recording
