## ADDED Requirements

### Requirement: Photo attachments
The composer SHALL offer an attach button that lets the user take a photo or pick up to 4 from the library. Each image is resized to at most 1568 px on its longest side and re-encoded as JPEG before upload, and shown as a removable chip above the input. Send MUST be enabled when there is text or at least one attachment. On Send the app uploads each image with `attachment.upload` and then sends `session.input` with the ids; on failure the text and chips are kept and a localized error is shown (`too_large`, `unsupported_media`, expired attachment, daemon without support).

#### Scenario: Photo without text
- **WHEN** the user picks one photo and taps Send with an empty field
- **THEN** the app uploads it, sends `session.input` with its id and clears the chip

#### Scenario: Remove before sending
- **WHEN** the user taps the remove button on a chip
- **THEN** that image is not sent

#### Scenario: Old daemon
- **WHEN** the daemon answers `attachment.upload` with `unknown_type`
- **THEN** the app shows a message asking to update the daemon and keeps the prompt
