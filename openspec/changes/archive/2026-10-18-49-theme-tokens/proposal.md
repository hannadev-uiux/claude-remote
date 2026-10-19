## Why

The app has one static palette (`apps/mobile/src/core/theme/tokens.ts`), imported by 57 files and frozen into `StyleSheet.create` at module load. Its accent is Claude's orange `#D97757`, which cannot remain the product color once other agents (Codex, Kimi, Qwen) share the same session list (#108), and there is no token for "accent as text" (needed by a light theme) nor for agent colors. Themes (#111), the redesigned screens (#153–#160) and the agent badges all need semantic tokens read at render time instead of module constants (#152).

## What Changes

- **Semantic tokens**, the same names in every theme: `background`, `surface`, `surfaceRaised`, `border`, `borderStrong`, `text`, `textMuted`, `textDim`, `accent` (fill), `accentText` (new), `accentInk` (text on an accent fill, new), `accentSoft`, `success`/`successSoft`, `warning`/`warningSoft`, `danger`/`dangerSoft`, `info`/`infoSoft`, `diffAdd`, `diffRemove`, `scrim`, `backdrop` (new, behind sheets), plus the 16 ANSI colors of the raw terminal. The `*Muted` fills are renamed `*Soft`.
- **Dark** stays the default and only theme of this change, looking like today except for two swaps: the accent becomes amber `#E8A33D` (`accentText` is the same color in dark) and `warning` goes from `#E5C07B` to `#F3DC7A`, so "waiting" no longer reads as the brand color. Light, Dracula and Catppuccin come in #111 on top of this infrastructure.
- **Agent colors**, fixed and outside the themes: `claude #D97757`, `codex #2FBF8F`, `kimi #5B9BF5`, `qwen #8C6CF5`. Providers (OpenRouter) get a neutral outline, never a color.
- **Theme at render time**: `useTheme()` (Zustand store with the preference `system` | `dark`, persisted on the device, and the system color scheme) and `makeStyles(theme => …)` memoized per theme replace the static `colors` import everywhere: design system components, screens, the markdown renderer (`colorScheme` from the theme), the xterm.js terminal (theme injected into the WebView and switchable live), the status bar style, the navigation header, `ActionMenu` (`userInterfaceStyle` from the theme) and the sheets' backdrop. `userInterfaceStyle: 'automatic'` in `app.config.ts`.
- **Live status colors from the theme**: the app sends its palette (`background`, `text`, `textMuted`, `accent`, `success`, `warning`) with `live.register` and in the props it writes itself; the daemon echoes it in every update of that registration; the widget falls back to the dark values when a payload has none (older daemons).
- **Guard rails**: a test that fails on any hex color literal under `apps/mobile/src` outside the theme module (generated files, tests and the widget's fallbacks excepted) and a parity test that every theme defines every token with a valid color.
- `CLAUDE.md` "Tema visual" updated to the amber accent, the agent colors and the theme module.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-shell`: the "Dark terminal theme" requirement becomes theme tokens read at render time, with dark as default and the amber accent.
- `product-identity`: amber is the product accent; `#D97757` becomes the Claude Code agent color, next to the other agents' colors.
- `live-status`: the widget colors come from the app theme palette carried in the props; `live.register` carries the palette.
- `protocol`: `live.register` and `LiveStatusProps` gain an optional `palette`.

## Impact

- `packages/protocol`: `LivePaletteSchema`, `palette` on `live.register` and `LiveStatusPropsSchema`.
- `apps/daemon`: `features/live-status` keeps the palette of each registration and includes it in the props it sends.
- `apps/mobile`:
  - `src/core/theme/` (palettes, agent colors, preference store, `useTheme`, `makeStyles`, `ThemeProvider`, tests).
  - `src/ui/*`, `src/app/*` layouts and every feature component that imported `colors`.
  - `scripts/build-xterm-html.mts` and the regenerated `xterm-html.generated.ts`.
  - `features/live-status` (`SessionActivity` reads the palette from the props; `use-live-status` sends it).
  - `app.config.ts` (`userInterfaceStyle: 'automatic'`, notification color amber).
- No new dependency. No visible change besides the accent and warning colors.
