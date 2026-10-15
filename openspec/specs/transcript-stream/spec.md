# transcript-stream Specification

## Purpose
Delivers session content to the app in real time, with paginated history and lossless resumption.

## Requirements

### Requirement: Tolerant normalization
The daemon SHALL convert each transcript line into zero or more normalized entries (`user`, `assistant_text`, `thinking`, `tool_use`, `tool_result`, `system`, `unknown`). Invalid lines or lines of an unknown type MUST NOT interrupt reading.

#### Scenario: Corrupted line
- **WHEN** a `.jsonl` line is not valid JSON
- **THEN** it is ignored and the following lines keep being streamed

#### Scenario: Internal types
- **WHEN** the line is `file-history-snapshot`, `atis-latch` or `queue-operation`
- **THEN** no entry is sent to the app

#### Scenario: Empty thinking
- **WHEN** a `thinking` block comes without text
- **THEN** no entry is sent for it

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
