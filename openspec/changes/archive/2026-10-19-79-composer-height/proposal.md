## Why

After sending a multi-line message the composer is cleared but keeps the height it had while typing (up to 140 pt), taking room from the conversation until the user types again (issue #129). The field is a `multiline` `TextInput` that sizes itself from its content; React Native's multiline input (notably on iOS, with a controlled `selection`) often does not recompute its intrinsic height when the value is changed from JS.

## What Changes

- The composer sizes its input explicitly: it tracks the content height reported by `onContentSizeChange`, clamps it between the one-line height (36 pt) and the maximum (140 pt), and sets `height`.
- An empty value always gets the one-line height, so clearing after a send (button, ⌘⏎, hardware Return, voice) or deleting all the text shrinks the field at once.
- Growing while typing keeps working up to the maximum, then the field scrolls.
- A failed send keeps the text and its height.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-conversation`: new requirement Composer height.

## Impact

`apps/mobile` only: pure `composerHeight` in `features/conversation/composer-height.ts` with Vitest tests; `PromptComposer` uses it. No new dependency, no label change; ships over the air.
