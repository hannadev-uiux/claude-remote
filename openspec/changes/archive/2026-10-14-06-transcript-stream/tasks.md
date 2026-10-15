## 1. Parser

- [x] 1.1 Create anonymized `.jsonl` fixtures from real transcripts; verify they are present in `test/fixtures`
- [x] 1.2 Implement a pure `parseTranscriptLine` with all types and truncation; verify with tests covering each type, an invalid line and an unknown type

## 2. Reading and tail

- [x] 2.1 Implement the incremental offset-based reader with a partial-line buffer and a line index; verify with a test that appends to the file in parts
- [x] 2.2 Implement a chokidar watcher per subscribed session with subscriber counting; verify with an integration test in a temporary directory

## 3. Protocol

- [x] 3.1 Register `session.subscribe`/`session.unsubscribe` with `sinceCursor` and `session.history`; verify with a WS test of resumption without duplicates
