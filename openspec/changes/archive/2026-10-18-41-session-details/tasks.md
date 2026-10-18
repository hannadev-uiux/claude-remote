## 1. Logic

- [x] 1.1 `sessionDetails()` row builder in `src/features/sessions/details.ts` with tests (rows, order, skipped rows, read-only, copy flags)
- [x] 1.2 Catalog keys (`sessionDetails.*`) in en-US, pt-BR and es-ES

## 2. UI

- [x] 2.1 `expo-clipboard` with `npx expo install`; `SessionDetailsSheet` (bottom modal, wrapped selectable values, Copy with "Copied" feedback, Close/back)
- [x] 2.2 Tappable header title (button role, label, hint, chevron) and folder in the info row open the sheet

## 3. Verification

- [x] 3.1 `pnpm check` green (protocol 72, daemon 274, mobile 205 tests; Biome on the worktree), `npx expo export --platform ios` bundles; independent review fixes applied (VoiceOver announcement, folder label, keyboard dismissal, touch target, per-row copy labels)
