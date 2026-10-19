# app-conversation Specification

## Purpose
Shows a session's conversation in real time and allows sending prompts and control keys.

## Requirements

### Requirement: Entry rendering
The screen SHALL show user messages, assistant text in markdown, collapsed thinking, collapsible tool calls with a one-line summary, and results; tool errors MUST appear in red. The assistant's leading dot SHALL take the session agent's color (Claude Code's until the protocol carries the agent); user messages keep the accent `>`.

#### Scenario: Tool call
- **WHEN** a `tool_use` entry for `Bash` arrives with `command` "pnpm test"
- **THEN** a collapsed "Bash(pnpm test)" line appears that expands to show the result

#### Scenario: Unknown entry
- **WHEN** an `unknown` entry arrives
- **THEN** a subtle block appears with the raw JSON collapsed

#### Scenario: Agent color
- **WHEN** an assistant message of a Claude Code session is shown
- **THEN** its leading dot is in the Claude Code color while the user prompt marker stays in the accent

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
The prompt field SHALL send `session.input` with `mode: auto` and clear the field after the `ack`, whether the prompt was sent or queued; on error, it MUST keep the text and show the message. In a read-only session the field MUST be disabled and its placeholder say so. Otherwise the placeholder SHALL name the agent when it is known (`message Claude Code… (@ files, / commands)`) and say `message the agent…` when it is not. While the message would be queued (the session is `running` or `waiting`, a permission is pending or prompts are already queued), the composer SHALL show the hint `Hold: send now · ⌘⏎` and label the send button as queueing; a long press on Send, and ⌘⏎ on a hardware keyboard, SHALL send with `mode: now`. The session's queued prompts SHALL be shown in a dashed `QUEUED · N` card above the composer, numbered in order, each with its text, a photo count when it has attachments, the delivery error when one failed, and Edit (a sheet that keeps the attachments), Remove and Send now actions; the card SHALL offer `Send all now`. The card mirrors `session.queue` and disappears when the queue is empty.

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
- **THEN** it reads "message Claude Code… (@ files, / commands)"

#### Scenario: Failed delivery shown
- **WHEN** the daemon could not deliver the first queued prompt
- **THEN** its row shows the error and Send now retries it

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
The session header SHALL have a "More options" button that opens a menu with "View terminal", "Change model…" when the session's profile has a provider, "Subagents (N)" / "Subagents (N · M running)" when the session has subagents, "Show keyboard shortcuts" / "Hide keyboard shortcuts", "Conversation history", "Stop following output" / "Follow output" and "Close session". "Change model…" SHALL open the model picker and send `/model <id>` to the session as a prompt delivered now. The menu MUST be native on iOS and look like the platform overflow menu on Android. In a read-only session, "View terminal", "Change model…", the shortcuts toggle and "Close session" MUST be disabled and the menu MUST say why; "Conversation history", the follow toggle and "Subagents" stay enabled. The button SHALL show an accent dot while any subagent runs. All labels MUST be translated.

#### Scenario: Open the terminal
- **WHEN** the user picks "View terminal" in a controllable session
- **THEN** the raw terminal screen of the session opens

#### Scenario: Change the model
- **WHEN** the user picks "Change model…" in a controllable OpenRouter session and chooses `anthropic/claude-opus-5.5`
- **THEN** the session receives `/model anthropic/claude-opus-5.5`

#### Scenario: Read-only session
- **WHEN** the user opens the menu in a session without a tmux pane
- **THEN** "View terminal", the shortcuts toggle and "Close session" are disabled, the follow toggle is enabled, and the menu explains that the session is read-only

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

### Requirement: Status bar
The session screen SHALL show a second context line under the first with, when known: the model as an outlined chip (with the effort level after a dot, `sonnet-5.5 · high`), the provider as a dashed chip (`via OpenRouter`, from the session's profile), the git branch (`⎇`), and then the context window usage and the profile's 5-hour and weekly usage limits. Items without data MUST be hidden (never shown as `0%`), a limit whose reset time has passed MUST be hidden, and the whole line MUST be hidden when nothing is known. Percentages SHALL use secondary text below 70%, Claude orange from 70% and red from 90%. Tapping the line SHALL open a sheet with the details (tokens used and window size, reset times in the device's locale). All texts MUST be translated.

#### Scenario: Full data
- **WHEN** the session reports Opus 5.5, effort high, context 62%, the folder is on branch `feat/rate-limit` and the profile reports 41% (5 h) and 73% (week)
- **THEN** the line shows the chip `Opus 5.5 · high`, `⎇ feat/rate-limit`, the context percentage and both limits

#### Scenario: OpenRouter session
- **WHEN** the session belongs to a profile whose provider is OpenRouter
- **THEN** the line shows the dashed chip `via OpenRouter` after the model chip

#### Scenario: No data
- **WHEN** the session has no status and its folder is not in git
- **THEN** no second context line is shown

#### Scenario: Near the limit
- **WHEN** the weekly limit reaches 92%
- **THEN** its percentage is shown in red

#### Scenario: Details
- **WHEN** the user taps the line
- **THEN** a sheet shows `124k / 200k` tokens and when each limit resets

### Requirement: Context line
Under the header, the session screen SHALL show a first context line with the agent badge, the profile tag (name in the profile color), the folder (truncating; opens the session details), the state pill and the permission mode chip. The header itself SHALL show, after the title, the notifications bell, a terminal button (disabled in read-only sessions) and the More options button.

#### Scenario: Live session
- **WHEN** a controllable Claude Code session in `~/projects/acme-api` is open
- **THEN** the context line shows the Claude Code badge, the profile tag, `~/projects/acme-api`, the state pill and the mode chip, and the header's terminal button opens the raw terminal

#### Scenario: Read-only session
- **WHEN** the session has no tmux pane
- **THEN** the terminal button is disabled and the mode chip is dimmed

### Requirement: Keyboard hints
While a hardware keyboard is attached on a tablet (the composer is focused and the keyboard on screen is shorter than a software one), the composer SHALL show a hints row under the field with `⏎ queue`, `⌘⏎ send now`, `⌘1–9 session`, `⌘K search`, `⌘T terminal`, `⌘. esc`, `⌘⇧M mode` and, while a tool permission waits in the session, `⌘A / ⌘D answer`; under the same condition Return in the composer SHALL send the prompt (queued while the session is busy) instead of inserting a newline. On phones and with a software keyboard nothing changes. All labels MUST be translated.

#### Scenario: Hardware keyboard on iPad
- **WHEN** the composer is focused on an iPad with a hardware keyboard and the session is working
- **THEN** the hints row is visible and pressing Return queues the typed prompt

#### Scenario: Software keyboard
- **WHEN** the software keyboard is up
- **THEN** no hints row is shown and Return inserts a newline

#### Scenario: Pending permission
- **WHEN** a tool permission is pending while the hints row is visible
- **THEN** the row also shows `⌘A / ⌘D answer`

### Requirement: Links in the conversation
The conversation SHALL render markdown links and bare URLs (`http://`, `https://`, `mailto:`) as links in every kind of entry: assistant messages (including inline code and code blocks), user messages, thinking, system lines and the expanded tool call output, JSON and input fields. A tap on a link whose target uses `https`, `http` or `mailto` MUST open it with the system handler. A link with any other target (another scheme, or a file path used as a markdown link target) MUST NOT be opened: a tap opens the link menu instead. A long press on any link SHALL open a menu with "Open" (only for `https`, `http`, `mailto`), "Copy link" and "Share"; copying MUST give a brief confirmation. File paths such as `src/foo.ts:12` MUST NOT be detected as links, and trailing punctuation or an unmatched closing parenthesis after a bare URL MUST NOT be part of it. Text that contains no link stays selectable.

#### Scenario: Open a markdown link
- **WHEN** an assistant message contains `[the PR](https://github.com/o/r/pull/1)` and the user taps "the PR"
- **THEN** the system opens `https://github.com/o/r/pull/1`

#### Scenario: Bare URL in tool output
- **WHEN** an expanded `Bash` result contains `Deployed to https://app.example.dev.` and the user taps the URL
- **THEN** `https://app.example.dev` opens, without the final period

#### Scenario: Copy with a long press
- **WHEN** the user long-presses a link and picks "Copy link"
- **THEN** the URL is in the clipboard and the app confirms the copy

#### Scenario: Unsafe scheme
- **WHEN** an assistant message links to `file:///etc/hosts` and the user taps it
- **THEN** nothing is opened and the menu offers only "Copy link" and "Share"

#### Scenario: File path
- **WHEN** a message shows `src/foo.ts:12`
- **THEN** it is not rendered as a link
