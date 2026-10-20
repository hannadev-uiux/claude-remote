## 1. Pure logic

- [x] 1.1 Add `apps/mobile/src/features/settings/theme-picker.ts` with a pure function that builds the picker's row list (System first, then `THEME_NAMES` in order) from the current preference and resolved scheme, returning per row: id, scheme tag (`dark`/`light`; System's own tag follows the theme it currently resolves to), and `selected`; verify with `theme-picker.test.ts` covering `system` resolving to dark and to light, and an explicit theme selected.
- [x] 1.2 Same module: a pure function for the Appearance row's subtitle text key/params (resolved theme name) consumed by `AppearanceCard`; verify with a unit test for each preference value.

## 2. i18n

- [x] 2.1 Add `settings.theme` (row label, e.g. "Theme"), `settings.themeTag.dark` / `settings.themeTag.light` and `settings.themeDone` ("Done") to `locales/en-US.ts`, `locales/pt-BR.ts` and `locales/es-ES.ts`; verify `pnpm --filter @remote-harness/mobile test i18n.test.ts` passes (key parity, no empty texts).

## 3. AppearanceCard

- [x] 3.1 Replace the wrapping row of `ThemeSwatch` tiles in `AppearanceCard.tsx` with a single `Pressable` row showing `t('settings.theme')` and the resolved theme's name with a trailing chevron, opening a new `ThemePickerSheet` modal; verify by rendering the card and asserting the row text via a snapshot-free RTL query is out of scope (no RN component tests in this repo) — verify manually in the simulator instead (see task 4.2).
- [x] 3.2 Build `ThemePickerSheet` as a `Modal` (`transparent`, `animationType="slide"`, backdrop `Pressable` to close) following the bottom-sheet pattern already used by `ProfileDetailsSheet` (`ProfilesCard.tsx`): a scrollable list (`ScrollView` or `FlatList`, the choice count is fixed and small so either works) of rows from task 1.1, each with a fixed-size preview swatch (reuse the existing two-half preview for System, single preview otherwise), the theme name, the scheme tag, and a check icon (`lucide-react-native`) on the selected row.
- [x] 3.3 Tapping a row calls `setThemePreference(choice)` immediately (live preview) without closing the modal; a "Done" button (`t('settings.themeDone')`) closes it; verify by reading the updated component and confirming `setThemePreference` is called on row press and the modal's `visible` state only changes on Done or backdrop press.
- [x] 3.4 Accessibility: each row keeps `accessibilityRole="radio"` and `accessibilityState={{ selected }}` with the theme's translated name as `accessibilityLabel`; the row that opens the modal gets `accessibilityRole="button"` with a label combining "Theme" and the current value; verify by reading the finished component.

## 4. Verification

- [x] 4.1 Run `pnpm check` (typecheck + Vitest + Biome) green.
- [x] 4.2 Manually verify in the iOS simulator: open Settings → Appearance, confirm the single Theme row, open the modal, tap through every theme and System, confirm the live preview and the check mark follow the tap, confirm "Done" closes the modal, and confirm System's subtitle in the modal names the resolved theme. (No dev build was available for this session's simulator; verified instead via `npx expo export --platform ios`, which bundles the full app successfully, plus a full read-through of the finished component against the task 3.x requirements. Recommend a manual simulator pass before merging if a dev build is available.)
