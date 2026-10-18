## Context

`ToolCallCard` renders a `tool_use` entry paired with its `tool_result`. Collapsed, it shows the `summarizeTool` line, a one-line preview of the result and the first lines of the diff for file edits. Expanded, it shows the input JSON (when there is no diff) and the result cut at 4,000 characters. The result reaching the app is already capped by the daemon (`truncated` flag).

## Decisions

### Pure module
`features/conversation/tool-details.ts` holds everything testable:
- `toolInputFields(name, input)` → `InputField[]`, where a field is either `{ field: FieldKey, value }` (a known label, translated by the card under `tools.fields.*`) or `{ key, value }` (a raw input key shown as is). Empty values are skipped; known tools that yield no field fall back to the raw keys, so the tab is never empty while the input has content. Values are language-neutral (paths, numbers, `10–59` ranges), so the module needs no `t`.
- `toolCallJson(use, result)` → the pretty-printed `{ name, input, result: { content, isError, truncated } }`.
- `cutText(text, limit)` → `{ text, hidden }` for "Show more".
- `toolType(name)` (`mcp__*` → `mcp`), `tabFor(saved, name, available)` and `rememberTab(saved, name, tab)`; the saved map keeps at most 40 types, dropping the oldest.

### Per-tool input
| Tool | Fields |
|------|--------|
| Bash | command, description, timeout (ms), background flag |
| Read | path, lines (`offset–offset+limit-1`, `offset–`, `1–limit`), pages |
| Edit / MultiEdit / Write | path, replace all flag / edit count / line count |
| NotebookEdit | path, cell, mode |
| Grep | pattern, path, glob, type, output mode |
| Glob | pattern, path |
| Task / Agent | description, agent, prompt |
| WebFetch | url, prompt |
| WebSearch | query |
| TodoWrite | one line per item, prefixed `☐` / `◐` / `☑` by status |
| Skill | skill, args |

Flags have the value `✓`. Non-string values of unknown tools are shown as compact JSON.

### Tab memory
A Zustand store (`tool-tab-store.ts`) keeps the map in memory and writes it to SecureStore under `remote-harness.tool-tabs`, like the key bar; `restoreToolTabs()` runs at app start next to `restoreKeyBar()`. MCP tools share one type because their names are unbounded and long; the 40-type cap keeps the stored value well under SecureStore's 2 KB guidance.

### Card
Collapsed state is unchanged. Expanded, a row of three tab buttons (accent underline on the selected one) sits above the content. Output: `DiffView` with all lines, then the result in the existing horizontal `ScrollView`. Input: a label/value list. JSON: the raw text in a horizontal `ScrollView`. Output and JSON texts go through `cutText` with a "Show more" button; the expanded state resets when the card collapses. The diff is shown in the collapsed preview and in Output only, no longer duplicated outside the tabs.

### Copy
`Text selectable` gives the native copy menu on iOS and Android. A dedicated copy button would need `expo-clipboard`, a native module that forces a new app build; left out so the change ships over the air.

## Risks / Trade-offs

- [Rendering 100 KB of text after "Show more" can be slow] → the daemon already caps results; the cut keeps the default view light.
- [Field tables drift from Claude Code's tool schemas] → missing fields only fall back to raw keys and the JSON tab always has everything.
