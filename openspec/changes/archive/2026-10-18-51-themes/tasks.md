## 1. Palettes

- [x] 1.1 `palettes.ts`: Light, Dracula, Catppuccin Mocha and Latte (tokens from the prototype table, official ANSI colors); `resolveThemeName` maps light → light
- [x] 1.2 Tests: parity for the five themes, WCAG contrast (text ≥ 4.5, muted/accentText ≥ 3, accentInk on accent ≥ 3; Latte ink darkened to pass), resolution table

## 2. Selector and native scheme

- [x] 2.1 `AppearanceCard` with `ThemeSwatch`es (System + five themes) in Settings; `settings.appearance` and `settings.themes.*` in pt-BR, en-US, es-ES
- [x] 2.2 `ThemeProvider` sets the native color scheme for an explicit theme and releases it (`unspecified`) for System

## 3. Docs and verification

- [x] 3.1 `CLAUDE.md` "Tema visual" lists the themes
- [x] 3.2 `pnpm check` green (turbo typecheck + tests 10/10; Biome on `apps packages`); `npx expo export --platform ios` bundles
