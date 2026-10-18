## MODIFIED Requirements

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
