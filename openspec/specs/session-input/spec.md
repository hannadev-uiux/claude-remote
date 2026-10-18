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

### Requirement: Message queue
`session.input` SHALL carry a delivery `mode`: `now` (the default: paste and submit right away, as before), `queue` (hold the prompt) or `auto` (hold it while the session is busy, that is `running`, `waiting`, with a permission pending or with prompts already queued; otherwise deliver right away). The reply SHALL say whether the prompt was `sent` or `queued`. Queued prompts (text and attachment ids) SHALL be kept per session in the daemon, in order, persisted atomically so they survive a restart, broadcast as `session.queue` on every change and replayed to clients that connect later. When a session is `idle`, controllable and has no permission pending, the daemon SHALL deliver the first queued prompt after a short settle and then wait for that turn (the prompt registered, then the session idle again) before delivering the next one. A delivery that fails SHALL keep the prompt at the head with the error and stop automatic delivery for that session until the user edits it, sends it now or removes it. `queue.update`, `queue.remove`, `queue.sendNow` (deliver one prompt immediately, even mid-turn) and `queue.flush` (deliver every queued prompt immediately, in order, stopping at the first error) SHALL act on the queue; a prompt that `sendNow` cannot deliver goes back to the head with the error. The queue of a session SHALL be cleared when the session ends or loses its pane. A session's queue SHALL hold at most 20 prompts; queueing into a read-only session MUST be rejected with `not_controllable`, an empty prompt with `bad_request`.

#### Scenario: Queued while working
- **WHEN** the app sends "also update the README" with `mode: auto` to a `running` session
- **THEN** the daemon answers `queued`, nothing is pasted, and every client receives `session.queue` with the prompt

#### Scenario: Delivered after the turn
- **WHEN** the session's `Stop` hook arrives and no permission is pending
- **THEN** the daemon pastes the first queued prompt, presses Enter, and the next one waits until that turn ends

#### Scenario: Permission pending
- **WHEN** the session is `idle` but a permission request is still waiting for an answer
- **THEN** no queued prompt is delivered until the request is resolved

#### Scenario: Failed delivery
- **WHEN** pasting the head prompt fails because its attachment expired
- **THEN** the prompt stays first with the error, the clients see it, and the daemon delivers nothing else from that queue until the user edits, sends or removes it

#### Scenario: Send now
- **WHEN** the user picks "Send now" on a queued prompt while the session is `running`
- **THEN** the daemon pastes it immediately and removes it from the queue

#### Scenario: Restart
- **WHEN** the daemon restarts with two prompts queued for a live session
- **THEN** both are still queued afterwards and are delivered when the session turns idle
