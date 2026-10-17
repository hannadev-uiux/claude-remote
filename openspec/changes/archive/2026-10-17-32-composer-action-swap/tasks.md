## 1. App

- [x] 1.1 Pure `composerActions` selector in `features/conversation/composer-actions.ts` with Vitest tests
- [x] 1.2 `PromptComposer` renders attach/mic/Send from the selector with Reanimated `ZoomIn`/`ZoomOut` (`ReduceMotion.System`), Send `hitSlop` and `accessibilityState`; `SmartComposer` passes `voiceActive`; `LayoutAnimationConfig skipEntering` so only swaps animate

## 2. Verification

- [x] 2.1 `pnpm check` green (mobile 172 tests) and `npx expo export --platform ios` bundles
