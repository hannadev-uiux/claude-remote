## Why

The app icon never changes: it's always the amber Tether on the dark gradient, no matter which of the five themes (#111, #222) the user picked. Issue #233 asks for the home-screen icon to optionally follow the theme, while still letting the user keep (or pick) a specific icon independently.

## What Changes

- **Per-theme icons.** `apps/mobile/scripts/icons.mts` gains one flat (no glow, per #227) alternate icon per theme — background and mark in that theme's colors — plus its Android adaptive foreground, written to `assets/app-icon/`.
- **`expo-alternate-app-icons`** (new dependency, iOS 51+/Android, `npx expo install`) wires those PNGs into the native projects: `app.config.ts`'s plugin config lists one `{name, ios, android}` entry per theme (`Dark`, `Light`, `Dracula`, `Mocha`, `Latte`); verified end-to-end with `npx expo prebuild --no-install` (iOS: `ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES` lists all five; Android: an `activity-alias` per theme, disabled by default).
- **A device-only preference**, `apps/mobile/src/features/settings/app-icon-store.ts` (same `SecureStore`-backed `zustand` store shape as the theme preference): **Match theme** (default), **Original**, or a specific theme — `apps/mobile/src/features/settings/app-icon.ts` holds the pure resolution logic (preference + resolved theme → native icon name or `null`, unit-tested).
- **Settings → App icon**, a new card (`AppIconCard.tsx`) right after Appearance. PR #295 (merged while this change was in progress) replaced Appearance's wrapping theme swatches with a select row that opens a scrollable modal, because swatches "wrapped unevenly across two rows and got worse with each new theme" — App icon has 7 choices (worse than the 6 themes that prompted that fix), so it follows the same row-opens-modal pattern from the start (`app-icon-picker.ts` mirrors `theme-picker.ts`'s pure row-building logic) instead of shipping the swatch grid it was first built with.
- **Platform-specific apply timing** (`useApplyAppIcon`, called once from the root layout): iOS applies immediately on a preference or resolved-theme change (never on a timer — iOS shows its own confirmation alert on every call); Android defers to `AppState` going to `background`.

## Capabilities

### Modified Capabilities
- `app-shell`: "App icon" notes the per-theme variants exist; "Settings screen" lists the new App icon card.

### New Capabilities (as a delta on `app-shell`)
- "App icon follows the theme": the preference, its three states, and the iOS/Android apply timing.

## Impact

- `apps/mobile/scripts/icons.mts`: per-theme icon generation (`ICON_THEMES`, `themedIconSvg`).
- `apps/mobile/app.config.ts`: `expo-alternate-app-icons` plugin config.
- New: `apps/mobile/src/features/settings/app-icon.ts`, `app-icon-picker.ts`, `app-icon-store.ts`, `AppIconCard.tsx` (+ tests).
- `apps/mobile/src/features/settings/SettingsScreen.tsx`, `apps/mobile/src/app/_layout.tsx` (restore + apply hook).
- New dependency: `expo-alternate-app-icons` (`package.json`, `pnpm-lock.yaml`).
- i18n (`settings.appIcon.*`) in pt-BR, en-US, es-ES.
- `openspec/specs/app-shell/spec.md`.

## Known gaps (documented, not silent)

- No on-device verification of the actual icon switch (the system confirmation alert on iOS, the launcher's delay on Android) — verified instead via `npx expo prebuild --no-install` (confirms the plugin wires both platforms correctly) and `expo export` (confirms the bundle and the Settings screen's image `require()`s resolve). A human should switch themes and the preference in a real build before relying on it.
- Icon names and previews only cover the five themes plus Original; a future theme (#111 already notes themes can grow) needs a matching icon added to `ICON_THEMES`/the plugin config/`AppIconCard`'s `PREVIEWS` by hand — not derived automatically.
