## Context

Observed in Claude Code 2.1.x: each content block of an assistant message becomes a separate line with the same `message.id`; `tool_result` comes in `user` lines; there are `system` (`turn_duration`), `attachment`, `permission-mode` and `custom-title` lines.

## Goals / Non-Goals

**Goals:** a pure parser, 100% tested with anonymized real fixtures.

**Non-Goals:** rendering (app), subagents (change 18).

## Decisions

- **Cursor = line index** (0-based). A line can produce several entries; each entry carries the line's `cursor` and an `index` within it; the app deduplicates by `uuid + index`.
- **Incremental reading by byte offset**: stores a `byteOffset` per file; on change, reads from the offset to the end and only processes complete lines (buffering the partial line).
- **In-memory line index** (offsets) per subscribed session for pagination without rereading everything; built on the first subscription with a stream.
- **`chokidar` with `awaitWriteFinish` disabled** and `usePolling: false` (FSEvents on macOS) for low latency.
- **`tool_result`** truncated at 20 KB per entry (with a `truncated` flag), avoiding huge WS messages.
- `permission-mode` and `custom-title` lines do not become entries, but they update the session in the registry.

## Risks / Trade-offs

- [Format changes] → tests with fixtures; the `unknown` type is shown as a gray block in the app with the raw JSON collapsed.
