# app-conversation Specification

## Purpose
Shows a session's conversation in real time and allows sending prompts and control keys.

## Requirements

### Requirement: Entry rendering
The screen SHALL show user messages, assistant text in markdown, collapsed thinking, collapsible tool calls with a one-line summary, and results; tool errors MUST appear in red.

#### Scenario: Tool call
- **WHEN** a `tool_use` entry for `Bash` arrives with `command` "pnpm test"
- **THEN** a collapsed "Bash(pnpm test)" line appears that expands to show the result

#### Scenario: Unknown entry
- **WHEN** an `unknown` entry arrives
- **THEN** a subtle block appears with the raw JSON collapsed

### Requirement: Diffs
`Edit`, `MultiEdit` and `Write` tool calls SHALL show a diff with removed lines in red and added lines in green.

#### Scenario: File edit
- **WHEN** Claude edits a file
- **THEN** the tool call shows the path and the diff

### Requirement: Scrolling and history
The screen SHALL follow the end of the conversation while the user is at the end, and load earlier pages when scrolling to the top.

#### Scenario: Reading history
- **WHEN** the user has scrolled up and a new entry arrives
- **THEN** the position does not change and the "new messages" button appears

### Requirement: Prompt sending
The prompt field SHALL send `session.input` and clear the field after the `ack`; on error, it MUST keep the text and show the message. In a read-only session the field MUST be disabled.

#### Scenario: Successful send
- **WHEN** the user sends "continue"
- **THEN** the field is cleared and the prompt appears in the conversation once written to the transcript

### Requirement: Controls
The screen SHALL offer Esc (interrupt) and Ctrl+C (with confirmation), plus a key bar (arrows, Enter, Tab, 1-3).

#### Scenario: Interrupt
- **WHEN** the user taps Esc
- **THEN** the app sends `session.key` `Escape`

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
