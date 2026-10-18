## Context

Since #152 every color is read at render time from `THEMES[resolveThemeName(preference, system)]`; `THEMES` holds only `dark`, `resolveThemeName` maps every system scheme to it, and `ThemeProvider` mirrors `useColorScheme()` into the store. The prototype's token table gives the five palettes; Dracula and Catppuccin publish terminal (ANSI) palettes; the light terminal set is derived from the light tokens. Settings is a plain stack of `Card`s until #157.

## Goals / Non-Goals

**Goals:** four more palettes with parity and contrast guaranteed by tests; `system` follows the phone; a selector that applies live and survives restarts; native surfaces that do not clash with the chosen theme.

**Non-Goals:** the Settings redesign (sections Machine/Appearance/Profiles/…: #157); per-theme icons or splash (the splash stays dark: it shows before JavaScript runs); syncing the preference to the daemon.

## Decisions

- **Palettes as data.** `palettes.ts` gets `light`, `dracula`, `mocha` and `latte` next to `dark`, typed by `ThemeColors`/`AnsiColors`, so parity is enforced at compile time and by the existing test. `*Soft` fills use the same base color with the alpha the prototype uses (`0.16–0.18` → `29`/`2E`); `backdrop` and `scrim` stay black with alpha on dark themes and use a lighter scrim on light ones so sheets still read as layers.
- **ANSI.** Dracula and Catppuccin ship terminal palettes; they are copied as published (Catppuccin: red/green/yellow/blue/pink/teal and the subtext/surface grays for black/white). Light reuses the theme's semantic colors (danger/success/warning/info) plus purple and teal, with `white`/`brightWhite` as light grays so terminal output stays readable on `#F3F3F1`.
- **Resolution.** `SYSTEM_THEME = { dark: 'dark', light: 'light' }`; `THEME_NAMES` order is the order of the swatches after System.
- **Native scheme.** `ThemeProvider` calls `Appearance.setColorScheme(preference === 'system' ? null : theme.scheme)`. With an explicit theme, `useColorScheme()` then reports the forced scheme; the store keeps it as `system`, which is harmless because the preference wins, and it is reset to the real value when the user goes back to System (the provider sets `null` first, then the hook updates).
- **Appearance card.** `AppearanceCard` (features/settings) renders a horizontal, wrapping row of `ThemeSwatch`es: a 64-pt preview (background with three bars: accent 40 %, text 70 %, border 55 %) and the label on a `surface` strip; System shows a half-dark/half-light preview. Selected = accent border and accent label. Pressing calls `setThemePreference`. Labels come from `settings.themes.<name>`; the card title from `settings.appearance`. The swatch colors are read from the palettes themselves, so adding a theme needs no UI change.
- **Contrast test** (`palettes.test.ts`): WCAG relative luminance over the `#RRGGBB` values. Thresholds: `text` ≥ 4.5 on `background`, `surface`, `surfaceRaised`; `textMuted` and `accentText` ≥ 3 on `background` and `surface` (secondary text and labels). Values that fail are adjusted in the palette, not excused in the test.
- **Markdown, terminal, status bar, Live Activity** already follow `theme.scheme`/`theme.colors`; nothing to add besides the palettes.

## Risks / Trade-offs

- Catppuccin Latte's muted text is near the 4.5 line on its base color: the palette keeps the official values and the test holds secondary text to 3:1 only.
- Forcing the native scheme affects system alerts and the keyboard; it is scoped to an explicit preference, so users who pick System keep the phone's behavior.
