## 1. Counts

- [x] 1.1 `summary.ts`: `ListSummary` gains `running`, `waiting`, `tasks`, `agentsRunning`; `summary.test.ts` updated
- [x] 1.2 `MachineLine.tsx`: shows the non-zero running/waiting/tasks parts and "N agents · M running"; tapping running/waiting applies the `active` filter
- [x] 1.3 i18n: `sessions.runningCount`, `waitingCount`, `tasksCount` in pt-BR, en-US, es-ES (parity test)

## 2. Collapsing header

- [x] 2.1 `SessionFilterChips.tsx`: extract the profile/active/ended/sort chip list from `SessionsScreen`'s header row into a presentational component, used by both the row and the new sheet
- [x] 2.2 `SessionFiltersSheet.tsx`: bottom sheet (`Modal`, same pattern as `SessionActionsSheet`) showing `SessionFilterChips` wrapped
- [x] 2.3 `SessionSearch.tsx`: optional `focusable` prop (default `true`), skips the search-focus-request effect when `false`
- [x] 2.4 `SessionsScreen.tsx`: `AnimatedFlashList` (`Animated.createAnimatedComponent(FlashList)`), scroll handler tracking direction, shared values for collapsed state and the two layers' measured heights, `useReducedMotion` fallback; compact bar (mark glyph, `SessionSearch`, filters button with a dot); only active on compact width (`useWidthClass`)
- [x] 2.5 i18n: `sessions.filters` (compact bar's filters button label and the sheet's title — one key, same text) in pt-BR, en-US, es-ES

## 3. Verification

- [x] 3.1 `pnpm turbo run typecheck test` green
- [x] 3.2 `npx biome check --error-on-warnings apps packages openspec` clean
- [x] 3.3 `openspec validate 113-home-running-counts-collapsing-header --strict`
- [x] 3.4 `npx expo export --platform ios` bundles clean (4481 modules, no errors) — confirms the Reanimated/FlashList wiring is sound at the bundler level

## Known gaps (documented, not silent)

- No on-device verification of the scroll-collapse animation's feel (60fps, interruptibility) — only typechecked and unit-tested; the pure count/filter logic has tests, the animation itself does not (Reanimated worklets are not practically unit-testable here).
