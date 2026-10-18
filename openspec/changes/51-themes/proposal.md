## Why

The app ships one theme. #111 asks for a light theme and the popular editor themes Dracula and Catppuccin (Mocha and Latte), selectable in Settings, applied live, with readable contrast. The infrastructure (semantic tokens, `useTheme()`, `makeStyles`, theme-aware markdown, terminal, status bar and Live Activity palette) landed in #152; this change adds the palettes and the selector.

## What Changes

- **Four palettes** from the prototype token table (`docs/design/identity/index.html`), with the 16 ANSI colors each: **Light** (`#F3F3F1` background, amber accent with `accentText #A0640A`), **Dracula** (official palette, accent purple `#BD93F9`), **Catppuccin Mocha** (accent peach `#FAB387`) and **Catppuccin Latte** (accent peach `#FE640B`, `accentText #D14F00`). Dracula and Catppuccin use their official terminal colors; Light uses a light-terminal set. Agent colors stay fixed.
- **System preference** now resolves to Light when the phone is in light mode and Dark otherwise.
- **Settings → Appearance**: a card with one swatch per choice (System, Dark, Light, Dracula, Catppuccin Mocha, Catppuccin Latte), each previewing its background, accent, text and border; the current one gets the accent border. The choice is saved on the device and applies at once to every screen (list, conversation, terminal, settings, sheets, menus). #157 restyles the Settings screen around it.
- **Native surfaces follow the theme**: with an explicit theme the app sets the native color scheme (`Appearance.setColorScheme`) so alerts, action sheets and the keyboard match; with `system` it hands control back to the phone.
- **Contrast test**: every theme's `text` reaches WCAG AA (≥ 4.5:1) over `background`, `surface` and `surfaceRaised`; `textMuted` and `accentText` reach ≥ 3:1 over `background` and `surface`.
- Theme names in pt-BR, en-US and es-ES; `CLAUDE.md` lists the themes.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-shell`: "Theme preference" gains the list of themes, the light mapping, the Appearance selector and the native scheme; a new "Theme palettes" requirement fixes each palette's accent, scheme and contrast.

## Impact

- `apps/mobile/src/core/theme/` (`palettes.ts`: four palettes; `resolve.ts`: light mapping; `ThemeProvider.tsx`: native scheme; tests).
- `apps/mobile/src/features/settings/AppearanceCard.tsx` (new) and `SettingsScreen.tsx`; i18n catalogs (`settings.appearance`, `settings.themes.*`).
- `CLAUDE.md`. No protocol or daemon change.
