## Why

An expanded tool call shows its input as `JSON.stringify(input, null, 2)` followed by the result. For most tools the JSON is noise: the command of a `Bash` call or the range of a `Read` is buried among braces and quotes, and the output, which is usually what the user wants, comes after it (issue #43).

## What Changes

- An expanded tool call shows three tabs:
  - **Output** (default): the diff for `Edit` / `MultiEdit` / `Write` (the existing `DiffView`) and the tool result, or "running…" while there is none.
  - **Input**: a readable list of labeled fields per tool (the command for `Bash`, the path and line range for `Read`, the pattern, folder and filters for `Grep`, the to-do items for `TodoWrite`…); unknown tools list their top-level keys.
  - **JSON**: the raw tool call (name, input and result) for debugging.
- The last tab chosen is remembered per tool type (all MCP tools share one type) and persisted on the device; tools never opened default to Output.
- Long outputs and JSON are cut at 4,000 characters with a "Show more" button that reveals the rest. All tab texts are selectable, so they can be copied with the system menu.
- Tab names, field labels and "Show more" in pt-BR, en-US and es-ES.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-conversation`: tool call details with Output / Input / JSON tabs, remembered tab per tool type, "Show more" for long texts.

## Impact

- `apps/mobile` only: new pure module `features/conversation/tool-details.ts` (input fields, raw JSON, text cut, tab choice) with Vitest tests; tab store persisted with SecureStore and restored at app start; `ToolCallCard` rewritten around the tabs; new keys in the three catalogs.
- No protocol or daemon change and no new native dependency, so it ships over the air.
