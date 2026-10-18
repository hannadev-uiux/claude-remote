## Why

While typing in the prompt field the keyboard covers half of the screen and there is no quick way to hide it (no "Done" button: the user has to scroll or tap elsewhere), nor to send special keys (Esc, arrows, Tab, ^C, 1/2/3) without leaving the field: the key bar sits under the conversation, hidden by default, apart from the keyboard (#55).

## What Changes

- A thin toolbar attached to the top of the keyboard, shown only while the prompt field is focused and the keyboard is up:
  - a **special keys** button that expands the same keys as the key bar (including the ^C confirmation) in the same row, right above the keyboard, and collapses them again; the expanded state is remembered on the device (collapsed by default);
  - a **hide keyboard** button.
- Tapping a key sends it without blurring the field: the keyboard stays open.
- With a hardware keyboard (iPad), when only the system shortcut bar is up, the toolbar keeps the special keys and drops the hide button.
- While the toolbar's keys are expanded, the key bar under the conversation is hidden, so the keys are not shown twice.
- Labels and accessibility texts translated in pt-BR, en-US and es-ES.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-conversation`: "Controls" gains the keyboard toolbar.

## Impact

- `apps/mobile`: pure toolbar rules with tests (`src/features/conversation/keyboard-toolbar.ts`), `keyboard-toolbar-store.ts` (SecureStore, restored at app start), a `useKeyboardHeight` hook, `KeyboardToolbar` component, `PromptComposer` focus tracking and `onKey` prop, `SmartComposer` wiring, `ConversationScreen` hides the duplicate key bar, catalog keys in the three locales.
- No new dependency, no protocol, daemon or native change: deliverable over the air.
