## Context

Normalized entries (change 06); cursor by line + index.

## Goals / Non-Goals

**Goals:** smooth scrolling with thousands of entries.

**Non-Goals:** message editing, images.

## Decisions

- **Per-session transcript store** (Zustand): sorted array + a `Set` of `uuid:index` keys for deduplication; `lastCursor` used on resubscription.
- **Grouping**: `tool_result` is matched to its `tool_use` by `toolUseId` in a pure selector (`buildTimeline`), producing `message | tool | thinking | system` items.
- **Inverted FlashList** is not used (known issues); a regular FlashList is used with `maintainVisibleContentPosition` and `onStartReached` for history.
- **Tool call summary** via a pure function (`summarizeTool`) covering Bash, Read, Edit, Write, Grep, Glob, Task/Agent, WebFetch, MCP.
- **Diff** with `diffLines` from the `diff` library for `old_string`/`new_string`.
- **Keyboard**: `KeyboardAvoidingView` with `behavior="padding"`; `react-native-keyboard-controller` if needed.

## Risks / Trade-offs

- [Heavy markdown in long messages] → items memoized by key.
