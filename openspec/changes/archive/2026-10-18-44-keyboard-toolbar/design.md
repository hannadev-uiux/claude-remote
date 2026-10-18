## Context

`ConversationScreen` wraps the list, the footer (permission cards), the optional `KeyBar` and the composer in a `KeyboardAvoidingView` (`padding` on iOS; Android resizes the window with `softwareKeyboardLayoutMode: 'resize'`). The composer is therefore always the last thing above the keyboard. `KeyBar` renders `DEFAULT_KEYS` in a horizontal `ScrollView` with `keyboardShouldPersistTaps="always"`, asks before sending ^C, and is toggled from the session options menu (`key-bar-store.ts`, hidden by default).

## Goals / Non-Goals

**Goals:** hide the keyboard with one tap; send special keys without leaving the field; same behavior on iOS and Android; deliverable over the air.

**Non-Goals:** removing the standalone key bar or its menu toggle; customizing which keys are shown; a toolbar for other text fields (pairing, new session).

## Decisions

- **No native dependency.** `react-native-keyboard-controller` (`KeyboardStickyView`/`KeyboardToolbar`) would need a new build and could not ship over the air, and iOS `InputAccessoryView` has no Android equivalent. Since the composer already sits right above the keyboard, the toolbar is rendered inside `PromptComposer`, below the input row: it ends up attached to the top of the keyboard on both platforms with the existing `KeyboardAvoidingView`.
- **One row, fixed height.** `[keys toggle] [keys…] [hide keyboard]`: collapsed, the middle is empty; expanded, it holds the `KeyBar` keys (horizontally scrollable). Expanding does not change the toolbar height, so the list does not jump.
- **Visibility from focus and keyboard height** (pure rules in `keyboard-toolbar.ts`, tested): `keyboardToolbar({ os, focused, keyboardHeight, expanded })` returns `{ visible, canDismiss, hideKeyBar }`.
  - Android: `visible = focused && keyboardHeight > 0`. The field stays focused when the back button hides the keyboard; requiring a keyboard keeps the toolbar from lingering at the bottom of the screen.
  - iOS: `visible = focused`. A hidden keyboard always blurs the field there, and iPadOS sends `keyboardWillHide` (height 0) for floating, split and undocked keyboards and for a hardware keyboard with the shortcut bar turned off; gating on the height would drop the toolbar in all those cases.
  - `canDismiss` is false only when `0 < keyboardHeight < 120`: with a hardware keyboard on iPad only the system shortcut bar is up (well under 120 pt), and the toolbar keeps the keys only. Software keyboards are over 200 pt. With a height of 0 the button stays (dismissing just blurs the field).
  - `hideKeyBar = visible && expanded`: the standalone key bar is hidden only while the toolbar shows the same keys, so nothing is lost when the toolbar is collapsed.
- **Keyboard height** comes from a small `useKeyboardHeight` hook over `Keyboard` events (`keyboardWillShow`/`WillHide` on iOS so the toolbar appears with the keyboard animation; `keyboardDidShow`/`DidHide` on Android, which has no "will" events), seeded with `Keyboard.metrics()`.
- **Keys do not blur the field.** The keys reuse `KeyBar` (its `ScrollView` already uses `keyboardShouldPersistTaps="always"`), and the toggle and hide buttons are plain `Pressable`s outside any scroll view, which do not blur a `TextInput`. The ^C confirmation is the same `Alert` as the key bar.
- **Shared state.** `keyboard-toolbar-store.ts` (Zustand) holds `expanded`, persisted with `expo-secure-store` under `remote-harness.keyboard-toolbar` (`expanded`/`collapsed`, default collapsed, restored at app start like the other per-device choices), and `keyBarHiddenBy`, the composer whose toolbar shows the keys, read by `ConversationScreen`. It is an owner rather than a boolean because two session screens can be stacked: the one below unmounting must not bring the key bar back on the one on top. The composer sets it in a layout effect, so the key bar leaves in the same frame the toolbar's keys appear.
- **Wiring.** `PromptComposer` gains `onKey` and `keysDisabled`; without `onKey` no toolbar is rendered. `SmartComposer` passes `prompt.sendKey`. A read-only session has a non-editable field, so it never gets focus nor the toolbar.

## Risks / Trade-offs

- The 120 pt threshold is a heuristic: a docked software keyboard shorter than that would be taken for a shortcut bar and lose the hide button; the keys still work and the user can tap elsewhere.
- Android floating keyboards (e.g. floating Gboard) report no inset, so the toolbar is not shown with them; the standalone key bar remains available from the menu.
- The ^C confirmation is a system alert (its own window on iOS, a dialog on Android), which may hide the keyboard while it is up; on Android the toolbar then goes away until the field gets the keyboard back (on iOS it follows focus and stays). This is not a blur caused by the toolbar, and the confirmation is worth keeping.
