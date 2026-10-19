## MODIFIED Requirements

### Requirement: Prompt sending
The prompt field SHALL send `session.input` with `mode: auto` and clear the field after the `ack`, whether the prompt was sent or queued; on error, it MUST keep the text and show the message. In a read-only session the field MUST be disabled and its placeholder say so (`Read-only session`). Otherwise the placeholder SHALL name the agent when it is known (`Message Claude Code…`) and say `Message the agent…` when it is not. The placeholder MUST stay on one line whatever the language and width, ending in an ellipsis when it does not fit, so the empty field never grows. While the message would be queued (the session is `running` or `waiting`, a permission is pending or prompts are already queued), the composer SHALL show the hint `Hold: send now · ⌘⏎` and label the send button as queueing; a long press on Send, and ⌘⏎ on a hardware keyboard, SHALL send with `mode: now`. The session's queued prompts SHALL be shown in a dashed `QUEUED · N` card above the composer, numbered in order, each with its text, a photo count when it has attachments, the delivery error when one failed, and Edit (a sheet that keeps the attachments), Remove and Send now actions; the card SHALL offer `Send all now`. The card mirrors `session.queue` and disappears when the queue is empty.

#### Scenario: Successful send
- **WHEN** the user sends "continue" to an idle session
- **THEN** the field is cleared and the prompt appears in the conversation once written to the transcript

#### Scenario: Queued while busy
- **WHEN** the user taps Send while the session is running
- **THEN** the field is cleared, the card shows `QUEUED · 1` with the message, and nothing is pasted until the turn ends

#### Scenario: Send now
- **WHEN** the user long-presses Send (or presses ⌘⏎) while the session is running
- **THEN** the prompt is pasted immediately, mid-turn

#### Scenario: Placeholder
- **WHEN** a Claude Code session is open and the field is empty
- **THEN** it reads "Message Claude Code…" on one line

#### Scenario: Placeholder on a narrow phone
- **WHEN** the composer is shown in pt-BR on a 320 pt wide screen
- **THEN** the placeholder stays on one line, cut with an ellipsis if needed, and the empty field keeps its one-line height

#### Scenario: Failed delivery shown
- **WHEN** the daemon could not deliver the first queued prompt
- **THEN** its row shows the error and Send now retries it

### Requirement: Controls
The screen SHALL offer Esc (interrupt) and Ctrl+C (with confirmation), plus a key bar (arrows, Enter, Tab, 1-3). The key bar SHALL be hidden by default and shown or hidden from the session options menu; the choice MUST be remembered on the device across app restarts.

While the prompt field is focused (on Android, also with the keyboard up), a toolbar SHALL be attached to the top of the keyboard with a "special keys" button and a "hide keyboard" button. While the special keys are collapsed, a composer with suggestions SHALL show `@` and `/` buttons in the toolbar: `@` inserts `@` at the cursor (after a space when the previous character is not whitespace) and opens the file suggestions; `/` is available only while the field is empty and inserts `/`, opening the command suggestions. Inserting MUST NOT blur the prompt field. The special keys button SHALL expand the same keys as the key bar (Ctrl+C still asks for confirmation) in the toolbar and collapse them again; the expanded state MUST be remembered on the device across app restarts and SHALL be collapsed by default. Sending a key from the toolbar MUST NOT blur the prompt field. When only a hardware keyboard's shortcut bar is up, the toolbar SHALL keep the special keys and omit the hide keyboard button. While the toolbar's keys are expanded, the key bar under the conversation MUST be hidden. All labels MUST be translated.

#### Scenario: Interrupt
- **WHEN** the key bar is shown and the user taps Esc
- **THEN** the app sends `session.key` `Escape`

#### Scenario: Default hidden
- **WHEN** the user opens a session for the first time on a device
- **THEN** the key bar is not shown

#### Scenario: Remembered choice
- **WHEN** the user chooses "Show keyboard shortcuts" and restarts the app
- **THEN** the key bar is shown in every session

#### Scenario: Hide the keyboard
- **WHEN** the prompt field is focused and the user taps "hide keyboard" in the toolbar
- **THEN** the keyboard closes and the toolbar disappears

#### Scenario: Key without leaving the field
- **WHEN** the toolbar's keys are expanded and the user taps ↑
- **THEN** the app sends `session.key` `Up` and the keyboard stays open

#### Scenario: Remembered expansion
- **WHEN** the user expands the toolbar's keys and restarts the app
- **THEN** the keys are expanded the next time the prompt field is focused

#### Scenario: Hardware keyboard
- **WHEN** a hardware keyboard is attached to an iPad and the prompt field is focused
- **THEN** the toolbar shows the special keys without the hide keyboard button

#### Scenario: No duplicate keys
- **WHEN** the key bar is shown and the user focuses the prompt field with the toolbar's keys expanded
- **THEN** the key bar under the conversation is hidden until the keyboard closes

#### Scenario: Insert a file mention
- **WHEN** the field holds "read" with the cursor at the end and the user taps `@` in the toolbar
- **THEN** the field holds "read @", the cursor is after `@` and the file suggestions open

#### Scenario: Command button
- **WHEN** the field is empty and the user taps `/` in the toolbar
- **THEN** the field holds "/" and the command suggestions open; once the field has text, `/` is disabled

#### Scenario: Read-only session
- **WHEN** the session has no live pane
- **THEN** the prompt field cannot be focused and no toolbar is shown
