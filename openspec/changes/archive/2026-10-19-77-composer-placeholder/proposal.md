## Why

The composer's placeholder is too long for a phone (issue #91): `message Claude Code… (@ files, / commands)` and its pt-BR and es-ES versions wrap onto two lines, so the empty composer is taller and looks broken. A multiline `TextInput` wraps its native placeholder, so a shorter text alone does not guarantee one line in every language and width.

## What Changes

- Shorter placeholder in the three languages: `Message Claude Code…` / `Mensagem para Claude Code…` / `Mensaje para Claude Code…` (`the agent` when unknown), and `Read-only session` capitalized the same way.
- The placeholder is drawn by the composer as a one-line text with an ellipsis over the empty field, instead of the native placeholder, so it never wraps and never grows the field.
- The `@` / `/` hint moves out of the placeholder into the keyboard toolbar: while the special keys are collapsed, `@` and `/` buttons insert the trigger at the cursor and open the suggestions (`/` only while the field is empty, since commands only count at the start of the prompt). They also save switching to the symbols layer of the phone keyboard.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-conversation`: one-line placeholder text in Prompt sending; `@` and `/` toolbar buttons in Controls.
- `product-identity`: the agent-neutral placeholder scenario uses the new text.

## Impact

`apps/mobile` only: `conversation.placeholder`, `conversation.placeholderReadOnly` and new `conversation.insertTrigger.*` labels in pt-BR, en-US and es-ES; pure `insertTrigger` in `features/autocomplete/trigger.ts` with Vitest tests; `PromptComposer` (overlay placeholder, trigger props), `KeyboardToolbar` (trigger buttons) and `SmartComposer` (wires them to the existing insert-at-cursor path). No new dependency; ships over the air.
