## Why

Seeing the conversation in real time is the app's core function (D3). The `.jsonl` is an internal Claude Code format and may change; the parser needs to be isolated and tolerant.

## What Changes

- Isolated parser that converts `.jsonl` lines into normalized `TranscriptEntry` objects, ignoring internal types (snapshots, latch, queue) and marking unknown ones as `unknown`.
- Tail with `chokidar` per subscribed session, streaming `transcript.entry` with a `cursor`.
- Paginated history (`session.history { before, limit }` → `transcript.page`).
- Resumption: `session.subscribe { sinceCursor }` resends the missed entries.

## Capabilities

### New Capabilities
- `transcript-stream`: reading, normalizing and streaming the sessions' transcripts.

### Modified Capabilities

## Impact

`features/transcript` module in the daemon; `chokidar` dependency.
