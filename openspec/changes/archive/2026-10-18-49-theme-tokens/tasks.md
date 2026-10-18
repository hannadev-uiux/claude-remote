## 1. Theme module

- [x] 1.1 `core/theme`: `palettes.ts` (types, dark palette with amber accent, ANSI), `agents.ts`, `resolve.ts`, `store.ts`, `use-theme.ts` (`useTheme`, `makeStyles`), `ThemeProvider.tsx`; `tokens.ts` keeps the non-color tokens
- [x] 1.2 Tests: palette parity and valid colors, `resolveThemeName`, hex literal guard over `apps/mobile/src`

## 2. Protocol and daemon

- [x] 2.1 `LivePaletteSchema`; `palette` on `live.register` and `LiveStatusProps`, with tests
- [x] 2.2 Daemon keeps the palette per registration and spreads it into the props it sends, with tests

## 3. App

- [x] 3.1 Design system (`src/ui/*`) and layouts read the theme; `ThemeProvider` in the root layout; status bar and header from the theme; `app.config.ts` automatic style and amber notification color
- [x] 3.2 Markdown (`colorScheme` and styles per theme), `ActionMenu` interface style, sheets' backdrop token
- [x] 3.3 Terminal: `build-xterm-html.mts` reads the injected theme and exposes `setTheme`; regenerated HTML; `TerminalView` injects and updates it
- [x] 3.4 Live Activity: `SessionActivity` reads `props.palette` with dark fallbacks; `use-live-status` sends the palette on register and in local props
- [x] 3.5 Every feature component converted from the static `colors` to `useTheme` / `makeStyles`; `LEVEL_COLORS.warning` → `warning`; unknown profile color fallback

## 4. Docs and verification

- [x] 4.1 `CLAUDE.md` "Tema visual" updated (amber accent, agent colors, theme module)
- [x] 4.2 `pnpm check` green (turbo typecheck + tests 10/10, daemon 338, mobile 309, protocol 88; Biome on `apps packages`, since the worktree lives under `.claude/`); `npx expo export --platform ios` bundles
