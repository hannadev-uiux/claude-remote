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
The screen SHALL offer Esc (interrupt) and Ctrl+C (with confirmation), plus a key bar (arrows, Enter, Tab, 1-3). The key bar SHALL be hidden by default and shown or hidden from the session options menu; the choice MUST be remembered on the device across app restarts.

#### Scenario: Interrupt
- **WHEN** the key bar is shown and the user taps Esc
- **THEN** the app sends `session.key` `Escape`

#### Scenario: Default hidden
- **WHEN** the user opens a session for the first time on a device
- **THEN** the key bar is not shown

#### Scenario: Remembered choice
- **WHEN** the user chooses "Show keyboard shortcuts" and restarts the app
- **THEN** the key bar is shown in every session

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

### Requirement: Composer action buttons
The composer SHALL show the attach and mic buttons, and no Send button, while the prompt has no text and no photos. With text, both MUST be replaced by Send. With photos and no text, it SHALL show the attach button and Send. While a voice recording is active or being transcribed, the mic MUST stay visible; while sending, Send MUST stay visible. A composer without attach or mic buttons always shows Send. The swap SHALL be animated subtly and without animation when the system requests reduced motion. Every button MUST have a touch target of at least 44 pt and a localized accessibility label.

#### Scenario: Empty field
- **WHEN** the prompt is empty
- **THEN** the composer shows the attach and mic buttons and no Send button

#### Scenario: Typing
- **WHEN** the user types "hi"
- **THEN** the attach and mic buttons are replaced by Send

#### Scenario: Photos only
- **WHEN** the user attached a photo and typed nothing
- **THEN** the composer shows the attach button and Send

#### Scenario: Recording
- **WHEN** a voice recording is in progress
- **THEN** the mic (stop) button stays visible

### Requirement: Session options menu
The session header SHALL have a single "More options" button that opens a menu with "View terminal", "Show keyboard shortcuts" / "Hide keyboard shortcuts" and "Conversation history". The menu MUST be native on iOS and look like the platform overflow menu on Android. In a read-only session, "View terminal" and the shortcuts toggle MUST be disabled and the menu MUST say why; "Conversation history" stays enabled. All labels MUST be translated.

#### Scenario: Open the terminal
- **WHEN** the user picks "View terminal" in a controllable session
- **THEN** the raw terminal screen of the session opens

#### Scenario: Read-only session
- **WHEN** the user opens the menu in a session without a tmux pane
- **THEN** "View terminal" and the shortcuts toggle are disabled and the menu explains that the session is read-only

### Requirement: Prompt history
"Conversation history" SHALL list the session's prompts from the loaded transcript, newest first, and offer to load earlier pages until the start of the transcript. Tapping a prompt MUST close the list and scroll the conversation to that prompt.

#### Scenario: Jump to an earlier prompt
- **WHEN** the user opens the history and taps a prompt sent earlier
- **THEN** the list closes and the conversation scrolls to that prompt

#### Scenario: Load earlier
- **WHEN** the transcript has older pages and the user taps "Load earlier"
- **THEN** older prompts are added to the end of the list
