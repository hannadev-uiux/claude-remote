## Why

The composer row now holds four controls (input, attach, mic, send), which crowds the input on a phone, and the attach and mic buttons are useless once the user is typing. Messaging apps solve this by swapping them for Send while there is text (issue #41).

## What Changes

- When the prompt is empty, the composer shows the attach and mic buttons and no Send button.
- As soon as there is text, both are replaced by Send, with a subtle fade/zoom that is skipped when the system asks for reduced motion.
- Photos waiting without text keep the attach button (to add more) and show Send instead of the mic.
- While recording or transcribing, the mic stays visible so the recording can be stopped; while sending, Send stays visible with its spinner.
- When no extra button is passed (e.g. a composer without attach/voice), Send is always shown, as today.
- Send gets a larger touch target (`hitSlop`) and an explicit disabled accessibility state.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-conversation`: composer action buttons.

## Impact

`apps/mobile`: `PromptComposer`, `SmartComposer`, a pure `composerActions` selector with Vitest tests. No protocol or daemon change.
