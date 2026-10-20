## 1. Icon generation and native wiring

- [x] 1.1 `icons.mts`: `ICON_THEMES` (background + accent per theme, matching `palettes.ts`), `themedIconSvg`, `adaptiveForegroundSvg` takes an optional color; writes `assets/app-icon/<theme>.png` and `<theme>-foreground.png`
- [x] 1.2 `npx expo install expo-alternate-app-icons`; `app.config.ts` plugin config (one entry per theme, PascalCase name, iOS PNG + Android adaptive foreground/background)
- [x] 1.3 Verified with `npx expo prebuild --platform all --no-install`: iOS `ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES` lists Dark/Light/Dracula/Mocha/Latte; Android has a disabled `activity-alias` per theme; generated `ios/`/`android/` removed after (gitignored, CNG project)

## 2. Preference and apply logic

- [x] 2.1 `app-icon.ts`: `AppIconPreference`, `resolveAppIconName` (pure, tested); imports `palettes.ts` directly (not the `@/core/theme` barrel, which pulls in React Native and breaks Vitest)
- [x] 2.2 `app-icon-store.ts`: `SecureStore`-backed preference store (same shape as the theme store); `useApplyAppIcon` — iOS applies on preference/resolved-theme change, Android defers to `AppState` background
- [x] 2.3 `_layout.tsx`: `restoreAppIconPreference()` at start-up, `useApplyAppIcon()` in `Shell`

## 3. Settings UI

- [x] 3.1 `app-icon-picker.ts`: row-building pure logic (`appIconRows`, `appIconRowLabel`, `appIconPreviewKey`), mirroring `theme-picker.ts` (tested)
- [x] 3.2 `AppIconCard.tsx`: select row ("App icon · <choice>") opening a modal with the scrollable list (Match theme first, then Original and one per theme), each row previewing its icon with a check mark on the selected one — same pattern as the just-redesigned `AppearanceCard` (#295), not the wrapping swatch grid this was first built with; added to `SettingsScreen` after Appearance
- [x] 3.3 i18n: `settings.appIcon.{title,row,matchTheme,original,done}` in pt-BR, en-US, es-ES (theme names reuse the existing `settings.themes.*` keys)

## 4. Verification

- [x] 4.1 `pnpm turbo run typecheck test` green (589 mobile tests)
- [x] 4.2 `npx biome check --error-on-warnings apps packages openspec` clean
- [x] 4.3 `openspec validate 115-app-icon-theme --strict`
- [x] 4.4 `npx expo export --platform ios` bundles clean, including the new `assets/app-icon/*.png` and `AppIconCard`'s `require()`s

## Known gaps (documented, not silent)

- No on-device verification of the actual icon switch (iOS's confirmation alert, Android's background-apply timing) — see proposal.md.
