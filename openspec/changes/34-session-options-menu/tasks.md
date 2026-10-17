## 1. App

- [x] 1.1 Pure `promptHistory` selector and `sessionMenuItems` builder with Vitest tests
- [x] 1.2 Persisted key bar preference (`key-bar-store.ts`, SecureStore), restored at app start
- [x] 1.3 `ActionMenu` in `src/ui` (`ActionSheetIOS` on iOS, anchored `Modal` menu on Android)
- [x] 1.4 Session header uses the "More options" menu; `ConversationScreen` shows `KeyBar` only when enabled and hosts the prompt history sheet with jump-to-prompt
- [x] 1.5 i18n keys in pt-BR, en-US and es-ES

## 2. Verification

- [x] 2.1 `pnpm check` green (mobile 177 tests) and `npx expo export --platform ios` bundles
