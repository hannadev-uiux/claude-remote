## Context

The conversation renders assistant text with `react-native-marked` through the `LinkRenderer` in `Markdown.tsx` (change 74): every text block is a root `Text`, selectable unless it holds a link, because a selectable native text view keeps the touches and nested press handlers never fire. User messages, thinking and system lines use `LinkifiedText`; the expanded tool call shows Output / Input / JSON tabs (`ToolCallCard.tsx`). Copy today is only the native "Copy" of a whole selectable block, and the link menu's "Copy link" (`link-menu.ts`, with haptic, announcement and Android toast). `SessionDetailsList` already has a copy button that swaps its icon for a check.

## Goals / Non-Goals

**Goals:**
- One tap to copy a message, a code block, an inline command, a tool output or an input field.
- Non-blocking feedback.
- Keep the native selection wherever there is nothing tappable inside the text.

**Non-Goals:**
- Partial selection inside markdown (the native text views copy a whole block).
- A long-press context menu per message (a visible button is easier to find and does not fight the native selection).

## Decisions

- **Pure helpers (`copy.ts`).** `toolTabCopyText(tab, use, result)` gives the Output tab's raw result and the JSON tab's `toolCallJson`, and `null` for Input (its fields copy one by one). `codeLabel(language)` keeps the first word of the info string (`ts title=x` → `ts`) or `null`. `plainText(node)` flattens a rendered React tree to its strings, for the block long press. All with Vitest tests.
- **Copy effect (`copy-text.ts`).** `copyText(value, t, { toast })` writes to `expo-clipboard`, then a success haptic, an accessibility announcement and, when asked and on Android, a `ToastAndroid`. `useCopied()` holds a "just copied" flag for 1.5 s for the icon swap. The link menu's copy uses the same effect.
- **`CopyButton`.** A small dim icon button (`Copy` → `Check`), with an accessibility label per use (`conversation.copy.message`, `.code`, `.output`, …). User and assistant messages show it on the right of the text, at the top; it does not show for empty text.
- **Code blocks.** The renderer's `code` returns a bordered box with a header row (language or nothing, and the Copy button) over the horizontal scroll of the code. The code text keeps its links (change 74).
- **Inline code.** The renderer's `codespan` returns a `CodeSpan` (nested `Text` with `onPress` and `onLongPress` that copy, with toast) unless the code has links, in which case the links keep their behavior. `block` treats a `CodeSpan` like a link: its root is not selectable, and gets an `onLongPress` that copies `plainText(children)`, so a long press outside the code still copies the block.
- **Tool calls.** The tab row gets a Copy button on the right while Output (with a result) or JSON is selected. Each Input field row gets a Copy button that copies its value.
- **i18n.** `conversation.copy.{message, code, inline, output, json, field, copied}` in the three catalogs.

## Risks / Trade-offs

- [Blocks with inline code lose native selection] → the block long press copies the same text the native "Copy" did, and the message button copies everything.
- [Accidental copy when tapping inline code] → copying is harmless and confirmed; taps that turn into scrolls are cancelled by the list.
- [Narrower message text] → the icon takes about 22 pt on the right of each message.
- [Device check] → taps and feedback need a visual check on a device; the logic is unit tested.
