## Context

`PromptComposer` renders a `multiline` `TextInput` with `placeholder={composerPlaceholder(...)}`. A multiline input wraps its native placeholder and grows to fit it; `numberOfLines` does not apply to the placeholder. The keyboard toolbar (change 44) has a toggle for the special keys on the left, the keys in the middle when expanded (an empty area otherwise) and "hide keyboard" on the right. `SmartComposer` already inserts text at the cursor (`insert`, used by suggestions and voice) and finds `@` / `/` triggers with `findTrigger`; commands only count at the very start of the prompt.

## Goals / Non-Goals

**Goals:**
- One-line placeholder on the narrowest phones, in all three languages.
- Keep the `@` / `/` affordance discoverable without the long hint.

**Non-Goals:**
- A first-use hint or tracking whether the user has used the triggers.
- Changing how suggestions are found or applied.

## Decisions

- **Copy.** `Message {{agent}}…`, `Mensagem para {{agent}}…`, `Mensaje para {{agent}}…`; read-only `Read-only session`, `Sessão somente leitura`, `Sesión de solo lectura`. Capitalized like the other field labels in the app; the agent name keeps coming from `agentLabel`.
- **Overlay placeholder.** When the value is empty, the composer draws a `Text` with `numberOfLines={1}` in the dim color, absolutely positioned over the input with the input's padding, font and size, and `pointerEvents="none"` so taps reach the input. The input gets no native `placeholder`, and its `accessibilityLabel` is the placeholder text, so screen readers still announce it. The overlay is hidden as soon as there is text.
- **Trigger insertion (pure).** `insertTrigger(text, cursor, trigger)` in `autocomplete/trigger.ts`: for `@`, insert at the cursor with a leading space when the previous character is not whitespace, cursor after `@`; for `/`, only on a blank prompt, giving `/` with the cursor at 1, and `null` otherwise. `findTrigger` then sees the new token and the suggestions open as if typed.
- **Toolbar buttons.** `KeyboardToolbar` takes optional `onTrigger` and `commandEnabled`; while the keys are collapsed and `onTrigger` is set, the middle area shows two small text buttons `@` and `/` (`/` disabled when `commandEnabled` is false). They are `Pressable`s outside any scroll view, like the toggle, so the field keeps focus. `PromptComposer` forwards `onTrigger` and `commandEnabled = value is blank`; `SmartComposer` wires `onTrigger` to `insert(insertTrigger(...))`. Composers without suggestions do not pass `onTrigger` and show no buttons.
- **i18n.** `conversation.insertTrigger.file` ("Mention a file") and `.command` ("Start a command") as accessibility labels in the three catalogs.

## Risks / Trade-offs

- [Overlay alignment differs slightly from the native placeholder by platform] → it uses the input's padding, font and size; a 1–2 pt offset is invisible at this size, and it is checked on device.
- [The `@` / `/` buttons only show while the field is focused] → that is when they are useful; the suggestions themselves remain the main path for users who type the triggers.
