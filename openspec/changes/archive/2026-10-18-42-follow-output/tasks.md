## 1. Logic

- [x] 1.1 `follow.ts` (`distanceFromEnd`, `isAtEnd`, `shouldFollow`, `newAtEnd`) with tests
- [x] 1.2 `follow-store.ts` (SecureStore, default on) restored at app start
- [x] 1.3 `sessionMenu` follow toggle item (enabled in read-only), tests and catalog keys in en-US, pt-BR and es-ES

## 2. Conversation

- [x] 2.1 `useFollowScroll` hook and `ConversationScreen`: no FlashList autoscroll; follow from `onContentSizeChange` (one scroll per frame); drag and fling tracking; fresh `atEnd` on growth; settling on open; keep the end on layout changes; "new messages" by last key; spinner as an overlay
- [x] 2.2 Session route wires the menu toggle

## 3. Verification

- [x] 3.1 `pnpm check` green (mobile 233 tests; Biome on the worktree), `npx expo export --platform ios` bundles; two independent reviews against FlashList 2.3.3 and RN 0.86 sources, findings fixed (fling snap-back, stale `atEnd`, tall last message on open, fling stopped by a tap, iPad stream switch, jump window, spinner shift)
