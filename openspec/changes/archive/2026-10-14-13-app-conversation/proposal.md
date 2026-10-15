## Why

Following and replying to the session is the app's main use (A3, A4).

## What Changes

- Session screen with user and Claude messages in markdown, collapsed thinking blocks, collapsible tool calls with a summary (e.g. `Bash(pnpm test)`), results and colored diffs for `Edit`/`Write`.
- History loading when scrolling up.
- Prompt field with send, Esc and Ctrl+C buttons (with confirmation) and key shortcuts.
- Header with profile, directory and state.

## Capabilities

### New Capabilities
- `app-conversation`: viewing the conversation and sending input from the app.

### Modified Capabilities

## Impact

`src/features/conversation`; dependencies `react-native-markdown-display` (maintained fork `@ronradtke/react-native-markdown-display`), `diff`.
