## 1. Logic

- [x] 1.1 Pure draft logic in `features/drafts/logic.ts` (`draftSummary`, `pruneDrafts`, `parsePersistedDraft`, storage key, text cap) with Vitest tests
- [x] 1.2 `drafts.*` labels in pt-BR, en-US and es-ES

## 2. Store and persistence

- [x] 2.1 `useDraftsStore` with set text / images / clear / clear all, debounced SecureStore persistence and flush on background
- [x] 2.2 `bindDrafts()` from the root layout: restore at start (photos rebuilt from their files, `imagesLost`), pruning on session list changes, clear all on forget machine

## 3. App

- [x] 3.1 `usePrompt` reads and writes the draft store; the composer shows the lost-photos notice
- [x] 3.2 `Draft:` line on `SessionRow` (subscribes to its own draft)
- [x] 3.3 Docs: drafts in Using the app and the privacy policy, in the three languages

## 4. Verification

- [x] 4.1 `pnpm check` green and `npx expo export --platform ios` bundles; restoring after the OS kills the app still needs a check on a device
