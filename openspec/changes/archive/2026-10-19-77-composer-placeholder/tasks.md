## 1. Copy and logic

- [x] 1.1 Shorter `conversation.placeholder` / `placeholderReadOnly` and `conversation.insertTrigger.*` in pt-BR, en-US and es-ES; update `composer-placeholder` tests
- [x] 1.2 Pure `insertTrigger` in `autocomplete/trigger.ts` with Vitest tests

## 2. Composer

- [x] 2.1 One-line overlay placeholder in `PromptComposer` (accessibility label on the input)
- [x] 2.2 `@` and `/` buttons in `KeyboardToolbar`, forwarded by `PromptComposer` and wired in `SmartComposer`

## 3. Verification

- [x] 3.1 `pnpm check` green and `npx expo export --platform ios` bundles; the overlay alignment and the toolbar buttons still need a visual check on a device (iPhone SE width)
