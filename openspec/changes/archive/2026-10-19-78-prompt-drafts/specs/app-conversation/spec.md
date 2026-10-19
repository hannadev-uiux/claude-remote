## ADDED Requirements

### Requirement: Prompt drafts
The composer's text and attached photos SHALL be kept as a draft per session: leaving the session screen, opening another session, backgrounding the app or the OS killing it MUST NOT lose them, and opening the session again SHALL restore them. Drafts MUST be persisted on the device only (secure storage, excluded from backups and device migration), never sent to the daemon nor included in push payloads. A successful send SHALL clear what was sent from the draft; a failed send MUST keep it. Emptying the field and removing the photos SHALL discard the draft. Photos SHALL be persisted as references to their local copies; when a copy cannot be read after a relaunch, the text MUST still be restored and the composer SHALL say the photos could not be restored. Drafts SHALL expire after 7 days, SHALL be removed when their session is absent from the session list and the draft was last edited more than an hour ago, and MUST all be cleared when the machine is forgotten.

#### Scenario: Leave and come back
- **WHEN** the user types "refactor the parser" in a session, goes back to the list and opens the session again
- **THEN** the field contains "refactor the parser"

#### Scenario: App killed in the background
- **WHEN** the user types a prompt, backgrounds the app and the OS kills it, then the user opens the app and the session
- **THEN** the prompt is restored

#### Scenario: Sent
- **WHEN** the draft is sent successfully
- **THEN** the field is empty and the session has no draft

#### Scenario: Send fails
- **WHEN** sending the draft fails
- **THEN** the text and photos stay and remain the session's draft

#### Scenario: Photos gone
- **WHEN** a draft with a photo is restored after a relaunch and the photo's local copy no longer exists
- **THEN** the text is restored and the composer says the photos could not be restored

#### Scenario: Forget the machine
- **WHEN** the user forgets the machine in Settings
- **THEN** every draft is deleted from the device
