## Context

`PromptComposer` renders `<TextInput multiline style={{ minHeight: 36, maxHeight: 140, paddingVertical: 8, borderWidth: 1 }} />` and lets the native view size itself. `usePrompt.send` clears the value after a successful send (`setText('')`, now through the draft store), and `SmartComposer` briefly sets a controlled `selection` after inserting suggestions. On iOS the `UITextView` keeps its last intrinsic height when the text is replaced programmatically, so the field stays tall.

## Goals / Non-Goals

**Goals:**
- One-line height whenever the field is empty, on iOS and Android.
- Same growth behavior while typing, up to the maximum, then scrolling.

**Non-Goals:**
- Animating the height change (the conversation list already adjusts to the composer's layout).
- Changing the maximum height or the padding.

## Decisions

- **Explicit height.** `PromptComposer` keeps `contentHeight` from `onContentSizeChange` (`nativeEvent.contentSize.height`) in state and sets `style.height = composerHeight(value, contentHeight)`. `minHeight` / `maxHeight` stay as a safety net.
- **Pure clamp.** `composerHeight(value, contentHeight)` returns the one-line height (`36 + extra`) when `value` is empty or the content height is unknown, otherwise `clamp(ceil(contentHeight) + extra, 36 + extra, 140)`. `extra` is what the reported content height leaves out of the border box: on iOS the content size includes the padding (`textContainerInset`) but not the 1 pt borders, so `extra = 2`; on Android it includes both (compound padding), so `extra = 0`.
- **Reset on empty.** Because the empty case ignores `contentHeight`, the stale value left by a programmatic clear never applies; the next `onContentSizeChange` (one line) updates it for the following message.
- **No remount.** Remounting the input (a `key` bump) would also reset the height but drops focus and closes the keyboard, so it is not used.

## Risks / Trade-offs

- [Content height differs by a pixel between platforms] → rounding up and the `minHeight` floor keep one line at 36 pt; checked on device.
- [`onContentSizeChange` fires on every line change] → one state update per line, not per keystroke.
