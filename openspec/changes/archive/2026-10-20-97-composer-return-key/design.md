## Context

`PromptComposer` is a multiline `TextInput`. On tablets it switches to `submitBehavior: 'submit'` while `hardwareKeyboard()` holds: the field is focused and the reported keyboard height is below 120 pt. RN's `TextInput` reports no modifiers for hardware keys. Shortcuts go through `core/keyboard` (#127), which registers `UIKeyCommand`s via `react-native-key-command` on the AppDelegate. Since iOS 15, a focused text view keeps keys it uses itself (Return, arrows, Tab) unless the command sets `wantsPriorityOverSystemBehavior`, which the library does not expose. Its iOS unregister also compares strings by pointer, so it never removes anything. On Android the focused `EditText` consumes Return, the arrows and Tab before the activity's `onKeyDown`.

## Goals / Non-Goals

**Goals:**
- Return sends, ⇧⏎ inserts a new line, ⌘⏎ sends now, on iPhone and iPad with a hardware keyboard.
- Return / Tab / ↑ / ↓ / Esc drive the open suggestions.
- An opt-in "Return key sends" for the on-screen keyboard.

**Non-Goals:**
- Shift+Return, the arrows and Tab in the field on Android (the `EditText` consumes them; it would need a native view change).
- Detecting a hardware keyboard on Android phones: the field stays focused after the back button hides the keyboard, so "focused with no keyboard" is not a reliable signal there. Android phones keep Return as a new line unless the setting is on; Android tablets keep the #180 behavior.

## Decisions

- **Priority as a registry option.** `useKeyCommand(combo, handler, enabled, { priority })` and `onKeyCommand(..., { priority })`. The stack records the flag per handler, and the native side wants priority while any live handler asks for it. `key-commands.ts` keeps the native state per combination and syncs it after every add and remove: register on the first handler, then unregister and register again whenever the wanted priority flips. Native calls run in order on the main queue. A command is never removed when its last handler goes: without priority it does not take keys from a focused field, a key nobody handles does nothing, and builds without the patch cannot unregister on iOS.
- **Duplicate events.** On those builds every priority flip leaves one more copy of the command, and each copy fires for the same press. `createDuplicateFilter(15)` (pure, tested) drops an event that repeats the previous key within 15 ms. That is far below any real repeat.
- **Patch, not fork.** `pnpm patch` on `react-native-key-command@1.0.18`. `HardwareShortcut` gains `priority`; `keyCommands` sets `wantsPriorityOverSystemBehavior` (iOS 15+); `registerKeyCommands` reads `priority` from the JSON; `matchesInput` uses `isEqualToString:`. The old method signatures stay. Android ignores the extra key.
- **Priority only while needed.** ⇧⏎ asks for it while the composer of the session on screen is focused and Return sends. ↑ / ↓ / Tab ask for it while that composer is focused and the suggestions list has rows. The list's own ↑ / ↓ handlers (#127) share the combination: while the suggestions are open, the composer's handlers are newer and win. Afterwards the native command drops back to no priority, so the caret keys work again.
- **Return goes through `onSubmitEditing`.** With `submit` behavior every Return reaches `onSubmitEditing`, on both platforms. `returnAction({ rows, canSend })` is pure: `accept` when the suggestions have rows, else `send` when there is something to send, else nothing. ⇧⏎ inserts `\n` at the selection with `insertAtSelection(text, selection, '\n')` (pure). The composer now tracks the selection's start too, not only its end.
- **Hardware detection.** `hardwareKeyboard({ os, tablet, focused, keyboardHeight })` holds when focused below 120 pt, on any iOS device or on an Android tablet. `SmartComposer` owns the focus state (via `onFocusChange`) and the height. It computes `submit = hardware || returnSends` and passes `submit`, `onSubmit` and the hints to `PromptComposer`, which only renders them.
- **Highlight model.** `pickableRows(suggestions)` flattens file items or command sections in display order; `moveHighlight(count, index, delta)` clamps without wrapping. The highlight resets to 0 whenever the trigger or the query changes. `SuggestionList` draws the highlighted row with the pressed style and scrolls the file list to keep it visible.
- **Hints.** `keyboardHints({ pendingPermission, layout, os }, t)`: phones get `⏎ queue`, `⇧⏎ new line` (iOS), `⌘⏎ send now`, `⌘/ shortcuts`; tablets keep their row and gain `⇧⏎ new line` (iOS) after `⌘⏎`.
- **Setting.** `return-key-store.ts` (SecureStore, like "Open the session after creating it") is restored at start. Settings → **Keyboard** has one switch with a hint. With it on, the on-screen keyboard's return key reads "Send" (`returnKeyType: 'send'`).

## Risks / Trade-offs

- [Priority for ↑ / ↓ takes the caret keys away while the suggestions are open] → that is the point; it ends as soon as the list closes or the field blurs.
- [The patch is native and was only syntax-checked locally] → the change is small and keeps the old API; the iOS build validates it before release.
- [Return in suggestions on the on-screen keyboard] → only with "Return key sends" on (submit behavior); otherwise Return still inserts a new line, as before.
