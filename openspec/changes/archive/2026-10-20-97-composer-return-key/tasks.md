## 1. Key priority

- [x] 1.1 `patches/react-native-key-command@1.0.18.patch`: optional `priority` per command (`wantsPriorityOverSystemBehavior`), unregister by value.
- [x] 1.2 `core/keyboard`: priority per handler in the stack, native registration synced with the handlers (tests).

## 2. Logic

- [x] 2.1 `conversation/return-key.ts`: `insertAtSelection`, `returnAction` (tests).
- [x] 2.2 `hardwareKeyboard` takes the platform and layout; `keyboardHints` phone row and `⇧⏎ new line` (tests).
- [x] 2.3 `autocomplete/keyboard.ts`: `pickableRows`, `moveHighlight` (tests).
- [x] 2.4 i18n in pt-BR, en-US and es-ES.

## 3. Composer

- [x] 3.1 `PromptComposer`: `submit`, `onSubmit`, `onFocusChange`, `showHints`, `returnKeyType` for the setting.
- [x] 3.2 `SmartComposer`: hardware detection on every iOS layout, Return → accept or send, ⇧⏎ new line, ↑ / ↓ / Tab in the suggestions with priority, selection start tracked.
- [x] 3.3 `SuggestionList`: highlighted row, file list scrolled to it.

## 4. Setting

- [x] 4.1 `return-key-store.ts` restored at start; Settings → Keyboard card.

## 5. Validation

- [x] 5.1 `pnpm check` green and `npx expo export --platform ios` bundles.
