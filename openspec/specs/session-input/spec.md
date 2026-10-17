# session-input Specification

## Purpose
Allows sending prompts and special keys to a Claude Code session running in tmux, as if they had been typed on the Mac.

## Requirements

### Requirement: Prompt delivery by paste
The daemon SHALL paste the full text into the session's pane using bracketed paste and then send Enter. Multi-line text, `@` and `/` MUST arrive unchanged.

#### Scenario: Multi-line prompt
- **WHEN** the app sends "line 1\nline 2"
- **THEN** the TUI receives both lines in a single prompt and submits it

#### Scenario: Prompt with a mention
- **WHEN** the app sends "review @src/main.ts"
- **THEN** the text is pasted without opening the autocomplete menu before the Enter

### Requirement: Special keys
The daemon SHALL accept only keys from an allowlist and send them with `send-keys`. Keys outside the list MUST be rejected with `invalid_key`.

#### Scenario: Interrupt
- **WHEN** the app sends `session.key` with `Escape`
- **THEN** the pane receives Esc

#### Scenario: Disallowed key
- **WHEN** the app sends the key `C-z`
- **THEN** the daemon responds with `error` `invalid_key`

### Requirement: Non-controllable session
Input to a session without a live pane MUST be rejected with `not_controllable`.

#### Scenario: Ended session
- **WHEN** the app sends text to an `ended` session
- **THEN** it receives `error` `not_controllable`

### Requirement: Size limit
Prompts above 100 KB MUST be rejected with `too_large`.

#### Scenario: Huge text
- **WHEN** the app sends 200 KB of text
- **THEN** it receives `error` `too_large`

### Requirement: Image attachments
The daemon SHALL accept `attachment.upload` for a controllable session, decode the base64 data and save it as `<uuid>.<ext>` in its private attachments directory (directory `0700`, file `0600`), the extension coming from the validated type. Data above 5 MB decoded MUST be rejected with `too_large`; a type outside the allowlist or bytes that do not match the declared type MUST be rejected with `unsupported_media`. Files older than 24 hours SHALL be deleted on start and periodically.

#### Scenario: PNG upload
- **WHEN** the app uploads a valid PNG for a controllable session
- **THEN** the daemon answers `attachment.uploaded` with an id and the file exists with mode `0600`

#### Scenario: Mismatched bytes
- **WHEN** the app uploads data declared as `image/jpeg` that is not a JPEG
- **THEN** it receives `error` `unsupported_media` and nothing is written

#### Scenario: Oversized image
- **WHEN** the app uploads 6 MB of image data
- **THEN** it receives `error` `too_large`

#### Scenario: Old files
- **WHEN** an attachment file is older than 24 hours
- **THEN** the daemon deletes it

### Requirement: Prompt with attachments
When `session.input` carries `attachmentIds`, the daemon SHALL resolve each id issued for the same session to its file and paste the text followed by each path on its own line (spaces escaped with a backslash). Unknown, expired or other-session ids MUST be rejected with `not_found`; an empty text with no attachments MUST be rejected with `bad_request`.

#### Scenario: Photo with text
- **WHEN** the app sends "what is wrong here?" with one attachment id
- **THEN** the pane receives "what is wrong here?" and, on the next line, the image path, then Enter

#### Scenario: Photo without text
- **WHEN** the app sends an empty text with two attachment ids
- **THEN** the pane receives the two paths, one per line, then Enter

#### Scenario: Unknown attachment
- **WHEN** the app sends an id the daemon never issued
- **THEN** it receives `error` `not_found` and nothing is pasted
