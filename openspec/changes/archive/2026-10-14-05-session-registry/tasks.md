## 1. tmux infra

- [x] 1.1 Implement `TmuxClient` (`listPanes`, `hasPane`, `capturePane`, `sendKeys`, `pasteText`, `newWindow`) on top of an injectable executor; verify with tests of the generated arguments

## 2. Registry

- [x] 2.1 Implement `SessionStore` with upsert, events and persistence in `state.json`; verify with upsert and restore tests
- [x] 2.2 Implement scanning of recent transcripts reading the tail (title, cwd, mode); verify with `.jsonl` fixtures
- [x] 2.3 Add `UserPromptSubmit` to the installed hooks; verify with a merge test
- [x] 2.4 Wire the hooks to the state transitions and the pane polling; verify with tests for each transition and for a dead pane
- [x] 2.5 Register the `sessions.list` → `sessions.snapshot` handler and the `session.updated` broadcast; verify with a WS integration test
