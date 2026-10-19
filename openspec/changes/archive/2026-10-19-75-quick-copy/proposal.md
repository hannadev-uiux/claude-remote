## Why

Copying from a session is clumsy (issue #89): there is no quick way to copy a whole answer, a tool output or a code block, so the user has to long-press a text block and copy all of it, or retype a command. Claude Code's terminal and the chat apps make this a one-tap action.

## What Changes

- User and assistant messages get a small copy button that copies the whole message (the markdown source for assistant messages).
- Fenced code blocks get a header with the language and a **Copy** button that copies the code.
- Inline code spans (`` `pnpm check` ``) copy on tap or long press. A text block with inline code is not natively selectable (a selectable text keeps the taps); a long press on the rest of it copies the whole block, as the native "Copy" did.
- An expanded tool call gets a copy button on the Output and JSON tabs (the raw output or the JSON), and each field of the Input tab (such as the `Bash` command) gets its own copy button.
- Every copy confirms without blocking: the copy icon turns into a check for a moment, plus a success haptic and an accessibility announcement; copies without an icon (inline code, block long press) show a short toast on Android.
- Copying is local: nothing is sent to the daemon.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-conversation`: quick copy of messages, code blocks, inline code and tool call details.

## Impact

`apps/mobile` only: pure helpers (`features/conversation/copy.ts`: text to copy for a tool tab, code block label, plain text of a rendered block) with Vitest tests, a shared copy effect and `CopyButton` used by `Messages.tsx`, `Markdown.tsx` (code block header, `CodeSpan`) and `ToolCallCard.tsx`, and `conversation.copy.*` strings in pt-BR, en-US and es-ES. `expo-clipboard` and `expo-haptics` are already in the app, so the change ships over the air. No protocol or daemon change.
