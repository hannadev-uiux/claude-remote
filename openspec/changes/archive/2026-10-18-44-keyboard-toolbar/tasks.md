## 1. Logic

- [x] 1.1 `keyboard-toolbar.ts` (`keyboardToolbar` rules) with tests
- [x] 1.2 `keyboard-toolbar-store.ts` (SecureStore, collapsed by default, `keyBarHiddenBy` owner) restored at app start
- [x] 1.3 Catalog keys in en-US, pt-BR and es-ES

## 2. UI

- [x] 2.1 `useKeyboardHeight` hook and `KeyboardToolbar` component (toggle, keys from `KeyBar`, hide keyboard)
- [x] 2.2 `PromptComposer` focus tracking, `onKey`/`keysDisabled` props and toolbar; `SmartComposer` wiring
- [x] 2.3 `ConversationScreen` hides the standalone key bar while the toolbar's keys are expanded

## 3. Verification

- [x] 3.1 `pnpm check` green (mobile 252 tests; Biome on the worktree), `npx expo export --platform ios` bundles; independent review against RN 0.86 sources, findings fixed (iPad floating/split keyboards, key bar removed in the same frame, owner-based key bar flag for stacked screens)
