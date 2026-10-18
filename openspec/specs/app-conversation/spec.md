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
The screen SHALL follow the end of the conversation while following is on, the user is at the end and is not scrolling the list (dragging or flinging); otherwise new content MUST NOT move the visible position. Following SHALL be on by default and switched from the session options menu; the choice MUST be remembered on the device across app restarts and apply to every conversation, subagents included. When a new entry arrives at the end and the list does not follow it, a "new messages" button SHALL appear; tapping it scrolls to the end. Loading earlier pages when scrolling to the top MUST NOT move the visible position and MUST NOT show the "new messages" button. Opening a conversation SHALL show its end, whatever the toggle says. When the list's height changes (keyboard, rotation) while the user is at the end, the end SHALL stay in view.

#### Scenario: Reading history
- **WHEN** the user has scrolled up and a new entry arrives
- **THEN** the position does not change and the "new messages" button appears

#### Scenario: Growing read-only session
- **WHEN** a read-only session keeps receiving entries and the user scrolls up to read
- **THEN** the list is not pulled back to the end, and tapping "new messages" brings it back

#### Scenario: Following off
- **WHEN** following is off, the user is at the end and a new entry arrives
- **THEN** the position does not change and the "new messages" button appears

#### Scenario: Remembered choice
- **WHEN** the user chooses "Stop following output" and restarts the app
- **THEN** following is still off in every session

#### Scenario: Earlier pages
- **WHEN** the user scrolls to the top and an earlier page loads
- **THEN** the messages that were visible stay in place and no "new messages" button appears

#### Scenario: Flick up while streaming
- **WHEN** following is on, entries keep arriving and the user flicks the list up from the end
- **THEN** the fling is not interrupted and the list stays where it stops

#### Scenario: Open with following off
- **WHEN** following is off and the user opens a conversation
- **THEN** the conversation opens at its end

#### Scenario: Keyboard opens at the end
- **WHEN** the user is at the end and focuses the prompt field
- **THEN** the last message stays visible above the keyboard

### Requirement: Prompt sending
The prompt field SHALL send `session.input` and clear the field after the `ack`; on error, it MUST keep the text and show the message. In a read-only session the field MUST be disabled.

#### Scenario: Successful send
- **WHEN** the user sends "continue"
- **THEN** the field is cleared and the prompt appears in the conversation once written to the transcript

### Requirement: Controls
The screen SHALL offer Esc (interrupt) and Ctrl+C (with confirmation), plus a key bar (arrows, Enter, Tab, 1-3). The key bar SHALL be hidden by default and shown or hidden from the session options menu; the choice MUST be remembered on the device across app restarts.

While the prompt field is focused (on Android, also with the keyboard up), a toolbar SHALL be attached to the top of the keyboard with a "special keys" button and a "hide keyboard" button. The special keys button SHALL expand the same keys as the key bar (Ctrl+C still asks for confirmation) in the toolbar and collapse them again; the expanded state MUST be remembered on the device across app restarts and SHALL be collapsed by default. Sending a key from the toolbar MUST NOT blur the prompt field. When only a hardware keyboard's shortcut bar is up, the toolbar SHALL keep the special keys and omit the hide keyboard button. While the toolbar's keys are expanded, the key bar under the conversation MUST be hidden. All labels MUST be translated.

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

#### Scenario: Read-only session
- **WHEN** the session has no live pane
- **THEN** the prompt field cannot be focused and no toolbar is shown

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
The session header SHALL have a single "More options" button that opens a menu with "View terminal", "Show keyboard shortcuts" / "Hide keyboard shortcuts", "Conversation history" and "Stop following output" / "Follow output". The menu MUST be native on iOS and look like the platform overflow menu on Android. In a read-only session, "View terminal" and the shortcuts toggle MUST be disabled and the menu MUST say why; "Conversation history" and the follow toggle stay enabled. All labels MUST be translated.

#### Scenario: Open the terminal
- **WHEN** the user picks "View terminal" in a controllable session
- **THEN** the raw terminal screen of the session opens

#### Scenario: Read-only session
- **WHEN** the user opens the menu in a session without a tmux pane
- **THEN** "View terminal" and the shortcuts toggle are disabled, the follow toggle is enabled, and the menu explains that the session is read-only

#### Scenario: Toggle following
- **WHEN** following is on and the user picks "Stop following output"
- **THEN** following turns off and the menu then offers "Follow output"

### Requirement: Prompt history
"Conversation history" SHALL list the session's prompts from the loaded transcript, newest first, and offer to load earlier pages until the start of the transcript. Tapping a prompt MUST close the list and scroll the conversation to that prompt.

#### Scenario: Jump to an earlier prompt
- **WHEN** the user opens the history and taps a prompt sent earlier
- **THEN** the list closes and the conversation scrolls to that prompt

#### Scenario: Load earlier
- **WHEN** the transcript has older pages and the user taps "Load earlier"
- **THEN** older prompts are added to the end of the list

### Requirement: Tool call details
An expanded tool call SHALL show its details in three tabs: **Output** (the diff for `Edit`, `MultiEdit` and `Write`, then the tool result, or a running indicator while there is none), **Input** (the tool input as labeled fields formatted per tool, with the top-level keys as fallback for unknown tools) and **JSON** (the raw tool name, input and result). A result with no matching tool call MUST show only Output and JSON. The app MUST remember the last tab chosen per tool type, with every MCP tool counted as one type, across app restarts; a tool type never chosen MUST open on Output. Outputs and JSON longer than 4,000 characters MUST be cut with a "Show more" control that reveals the full text. Texts in the tabs MUST be selectable. Tab names and field labels SHALL be translated (pt-BR, en-US, es-ES).

#### Scenario: Bash call
- **WHEN** the user expands a `Bash` call with `command` "pnpm test" that has finished
- **THEN** the Output tab is selected and shows the command output, and the Input tab shows a "Command" field with "pnpm test"

#### Scenario: Read range
- **WHEN** the user opens the Input tab of a `Read` call with `offset` 10 and `limit` 50
- **THEN** it shows the file path and the lines "10–59"

#### Scenario: Remembered tab
- **WHEN** the user picks the JSON tab on a `Grep` call and later expands another `Grep` call, even after restarting the app
- **THEN** the JSON tab opens, while a `Bash` call still opens on Output

#### Scenario: Long output
- **WHEN** a result has more than 4,000 characters
- **THEN** the Output tab shows the first 4,000 and a "Show more" control, and tapping it shows the whole result

#### Scenario: Unknown tool
- **WHEN** the user opens the Input tab of a tool the app does not know
- **THEN** each top-level input key is listed with its value, objects as compact JSON

### Requirement: Session details
Tapping the session title in the header, or the folder in the row below it, SHALL open a "Session details" sheet. The title MUST be exposed as a button with a localized accessibility label. The sheet SHALL list the full folder path, the git branch and worktree root when the folder is in git, the profile name, alias and config dir, the state, the permission mode, whether the session is controllable or read-only, the tmux pane when there is one, the session id and the last update. Values MUST wrap instead of being cut and MUST be selectable. The folder, the worktree root and the session id SHALL have a Copy action that puts the full value on the clipboard. The sheet MUST close with its Close button, by tapping outside and with the Android back button. All texts MUST be translated.

#### Scenario: Long folder
- **WHEN** the user taps the title of a session whose folder is longer than the screen width
- **THEN** the sheet shows the full path wrapped over several lines

#### Scenario: Copy the folder
- **WHEN** the user taps Copy on the folder row
- **THEN** the full path is on the clipboard and the row briefly shows "Copied"

#### Scenario: Read-only session
- **WHEN** the session has no tmux pane
- **THEN** the sheet shows the access as read-only and has no pane row

#### Scenario: Android back
- **WHEN** the sheet is open on Android and the user presses back
- **THEN** the sheet closes and the session screen stays open

### Requirement: Images in the conversation
The conversation SHALL show the images of user prompts and tool results as thumbnails of fixed size, below the prompt text and in the tool call (collapsed and in the Output tab). Image data MUST be fetched only when a thumbnail is about to be shown, with at most two fetches at a time, the newest first, fetches dropped when their thumbnail goes away before they start, and a size-capped cache, and a placeholder MUST keep the thumbnail's size while loading so the list does not move. Tapping a thumbnail SHALL open a full-screen viewer with pinch zoom, pan and double tap, closed with a close button, a single tap while not zoomed or the Android back button. An image that fails to load SHALL show a localized message and retry when tapped; while the daemon is disconnected it SHALL wait and load once the connection is back. An image over the size limit SHALL show a localized message with its size. All texts and accessibility labels MUST be translated.

#### Scenario: Screenshot in a tool result
- **WHEN** a tool result with an image is shown in the conversation
- **THEN** its thumbnail appears in the tool call and loads when it scrolls into view

#### Scenario: Full screen
- **WHEN** the user taps a thumbnail
- **THEN** the image opens full screen and can be zoomed with a pinch

#### Scenario: Too large
- **WHEN** an image ref is larger than the limit
- **THEN** the thumbnail shows that the image is too large to preview, without fetching it

#### Scenario: Android back
- **WHEN** the viewer is open on Android and the user presses back
- **THEN** the viewer closes and the conversation stays open
