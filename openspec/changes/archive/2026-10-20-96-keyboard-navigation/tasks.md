## 1. Key registry

- [x] 1.1 `src/core/keyboard/key-stack.ts`: combination id, handler stack with newest-first dispatch and pass-through, with Vitest tests.
- [x] 1.2 `src/core/keyboard/key-commands.ts`: one native registration per combination, one event subscription, `onKeyCommand` and `useKeyCommand`; move every `addListener` caller to it.

## 2. Logic

- [x] 2.1 `features/shortcuts/logic.ts`: `backAction`, `adjacentSessionId`, `shortcutSheet` with tests; `keyboardHints` gains `⌘/ shortcuts` (test updated).
- [x] 2.2 i18n `keys.*` / `shortcuts.*` in pt-BR, en-US and es-ES.

## 3. Shortcuts

- [x] 3.1 Shell: Esc (blur, then back) and ⌘[ on every layout; ⌘/ toggles the Keyboard shortcuts sheet (Esc closes it).
- [x] 3.2 Session: ⌘↑ / ⌘↓ and ⌥⌘↑ / ⌥⌘↓, ⌘⇧O (More options), ⌘L (focus the composer), ⌘F alias of ⌘K.
- [x] 3.3 List: arrows + Enter on phones while the list is visible; scroll to the cursor.
- [x] 3.4 `ActionMenu`: `openRequests`; ↑ / ↓ / Enter / Esc in the Android menu.
- [x] 3.5 Composer: Esc closes the open suggestions before the shell handler.

## 4. Android

- [x] 4.1 `withKeyCommandMainActivity` config plugin forwarding `onKeyDown` to `KeyCommandModule`.

## 5. Validation

- [x] 5.1 `pnpm check` green and `npx expo export --platform ios` bundles.
