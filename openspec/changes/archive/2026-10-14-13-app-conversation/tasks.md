## 1. Data

- [x] 1.1 Implement the transcript store with deduplication, pagination and cursor, wired to `session.subscribe`/`session.history` and to resubscription on reconnect; verify with store tests
- [x] 1.2 Implement `buildTimeline` and `summarizeTool`; verify with unit tests

## 2. UI

- [x] 2.1 Create the `UserMessage`, `AssistantMessage` (markdown), `ThinkingBlock`, `ToolCallCard`, `DiffView`, `UnknownEntry` components; verify with typecheck
- [x] 2.2 Create the `/session/[id]` screen with header, FlashList, history and a "new messages" button; verify with `expo export`
- [x] 2.3 Create `PromptComposer` and `KeyBar` (Esc, Ctrl+C with confirmation, arrows, Enter, Tab, 1-3); verify with typecheck and a send test
