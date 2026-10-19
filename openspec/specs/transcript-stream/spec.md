# transcript-stream Specification

## Purpose
Delivers session content to the app in real time, with paginated history and lossless resumption.

## Requirements

### Requirement: Tolerant normalization
The daemon SHALL convert each transcript line into zero or more normalized entries (`user`, `assistant_text`, `thinking`, `tool_use`, `tool_result`, `system`, `unknown`). Invalid lines or lines of an unknown type MUST NOT interrupt reading. User entries that Claude Code writes as XML-like tags MUST NOT become `user` entries: each `<task-notification>` SHALL become a `system` entry with subtype `task_notification`, the summary as text, its `status` and its optional `note`, without the task id, tool use id, output file, usage or result; `<bash-input>` SHALL become a `bash_input` system entry with the command, and `<bash-stdout>`/`<bash-stderr>` a `bash_output` system entry with both outputs (none when both are empty); any other entry made only of tag blocks SHALL become a `tagged` system entry with the first tag name in `tag` and the raw text.

#### Scenario: Corrupted line
- **WHEN** a `.jsonl` line is not valid JSON
- **THEN** it is ignored and the following lines keep being streamed

#### Scenario: Internal types
- **WHEN** the line is `file-history-snapshot`, `atis-latch` or `queue-operation`
- **THEN** no entry is sent to the app

#### Scenario: Empty thinking
- **WHEN** a `thinking` block comes without text
- **THEN** no entry is sent for it

#### Scenario: Task notification
- **WHEN** a user entry is a `<task-notification>` with status `stopped`, a summary, a note and an output file path
- **THEN** a `system` entry with subtype `task_notification`, status `stopped`, the summary and the note is sent, and the output file path is not

#### Scenario: Shell command
- **WHEN** the user runs `! git status` in Claude Code
- **THEN** a `bash_input` entry with `git status` and a `bash_output` entry with its output are sent instead of user entries

#### Scenario: Unknown tag
- **WHEN** a user entry is only `<new-thing>…</new-thing>`
- **THEN** a `tagged` system entry with tag `new-thing` is sent, not a `user` entry

### Requirement: Real-time streaming
After `session.subscribe`, the daemon SHALL send each new entry as `transcript.entry` with an increasing `cursor` less than 1 s after it is written to the file.

#### Scenario: New response
- **WHEN** Claude writes a response to the transcript of a subscribed session
- **THEN** the app receives the corresponding `transcript.entry`

### Requirement: Cursor-based resumption
With `sinceCursor`, the daemon SHALL send all entries after the cursor before the new ones; without `sinceCursor`, it MUST send the last page (50 entries).

#### Scenario: Reconnection
- **WHEN** the app reconnects and subscribes with `sinceCursor` 120
- **THEN** it receives the entries starting from cursor 121, without duplicates

### Requirement: Paginated history
`session.history { before, limit }` SHALL return `transcript.page` with up to `limit` (max. 200) entries before `before`, and `hasMore`.

#### Scenario: Scrolling up
- **WHEN** the app requests `before` 50 and `limit` 50
- **THEN** it receives the entries with cursor 0 to 49 and `hasMore: false`

### Requirement: Transcript images
The parser SHALL turn base64 image blocks of user messages and of tool result contents into image refs on the entry instead of placeholder text: a prompt's images attach to the prompt text entry of the same line; without prompt text they attach to the line's last tool result when there is one, or else to a `user` entry with empty text; a tool result's own images attach to that result. Each ref id SHALL identify the transcript line and the image's position in it. The daemon SHALL answer `transcript.image` by reading that line again and returning the image, for controllable and read-only sessions and for subagents; a malformed id or a missing image MUST be answered with `not_found`, an image over the limit with `too_large`. Serving history pages and images MUST NOT consume transcript lines that a live stream has not sent to its subscribers yet.

#### Scenario: Prompt with a screenshot
- **WHEN** a user line has a text block "what is wrong here?" and a PNG image block
- **THEN** one `user` entry has that text and one image ref with `mediaType` "image/png"

#### Scenario: Tool result with an image
- **WHEN** a `tool_result` block contains an image block and a text block
- **THEN** the `tool_result` entry has the text as `content` and one image ref, and no `[imagem]` text appears

#### Scenario: Fetch an image
- **WHEN** the app sends `transcript.image` with the id of that ref
- **THEN** the daemon answers with the PNG's media type and base64 data

#### Scenario: Unknown image
- **WHEN** the app sends `transcript.image` with an id whose line has no such image
- **THEN** the daemon answers `not_found`
