## 1. Header action

- [x] 1.1 Add a `newSession` prop (default `true`) to `SessionListActions` in `apps/mobile/src/features/sessions/components/SessionListActions.tsx`, rendering the `+` icon only when it is true.
- [x] 1.2 In `apps/mobile/src/app/(main)/index.tsx`, pass `newSession={false}` to `SessionListActions` in the compact header's `headerActions(...)`. Verify `apps/mobile/src/app/(main)/_layout.tsx`'s sidebar usage is left unchanged (still gets both icons).

## 2. Floating action button

- [x] 2.1 Create `apps/mobile/src/features/sessions/components/NewSessionFab.tsx`: a round, accent-colored button with the `Plus` icon, accessible label from `nav.newSession`, a selection haptic (`expo-haptics`, matching `Button.tsx`'s pattern) and `router.push('/new')` on press, positioned bottom-right with `position: 'absolute'`.
- [x] 2.2 In `SessionsScreen.tsx`, add a `fab` prop (default `false`); render `<NewSessionFab />` as the last child inside `Screen` when it is true, and increase the FlashList's `contentContainerStyle` bottom padding accordingly so the FAB never covers the last row.
- [x] 2.3 In `apps/mobile/src/app/(main)/index.tsx`, pass `fab` to `SessionsScreen` on the compact route. Verify the sidebar's `SessionsScreen` usage in `_layout.tsx` does not pass it.

## 3. Validation

- [x] 3.1 ~~Add or extend a unit test~~ — skipped: this repo has no unit tests for React Native components (only pure, non-`react-native` logic is Vitest-tested, per CLAUDE.md); neither `SessionListActions` nor `NewSessionFab` has pure logic to extract beyond a prop-gated render.
- [ ] 3.2 Run the app on phone- and iPad-sized simulators to confirm the header/FAB split and that the last row stays visible — **not run**: no iOS Simulator was booted and this project has no existing native build, so a first build was judged too slow for this pass; needs manual verification before shipping.
- [x] 3.3 Run `pnpm check` at the repo root and confirm it is green (typecheck, tests, Biome, plus `npx expo export --platform ios` for the bundle).
