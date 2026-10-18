## Context

`apps/mobile/scripts/icons.mts` already generates every PNG with `sharp` from SVG strings (icon, splash, favicon, Live Activity icon, Android adaptive, monochrome and notification icons), so the artwork is reviewable and reproducible. The installer builds the macOS bundle icon from `apps/mobile/assets/icon.png` (`buildIcns` in `features/service/launchd.ts`). The tray helpers draw a system icon (`terminal` SF Symbol; `utilities-terminal` on Linux). The setup wizard prints a block-character logo (`renderLogo`) sized by `BANNER_WIDTH = ICON_WIDTH + 2 + widest word`, with a test that the welcome box fits it. The prototype hub defines the mark once (`docs/design/identity/shared.js`, `#rh-mark` and `#rh-mark-bold`, viewBox 256).

## Goals / Non-Goals

**Goals:** one source for the mark, used by every asset; agent-neutral artwork; dark gradient + amber; small sizes legible (bold weight); the README and the daemon follow without extra steps; everything regenerable with one command.

**Non-Goals:** tray glyph states (working ring, waiting dot: #160); new screenshots (after #153–#157); the Windows tray; the bundle name "Claude Remote.app" (#66/#85); the landing page that will use `og.png` (#135).

## Decisions

- **Mark geometry** copied verbatim from the prototype, as two template functions `mark(weight)` returning the inner SVG (`<g>` of strokes + three node rects) in a 256 viewBox, so every asset positions it with a `<g transform="translate scale">`. Colors are parameters (`stroke`/node fill default to the same color); the Linux symbolic SVG uses the standard `#bebebe` so themes can recolor it. Nothing depends on `<use>`/`<symbol>`, which librsvg handles but makes the script harder to read.
- **Assets.** Sizes and placements follow the prototype pages: app icon mark box 640 at (192, 182) over `bgA` + `glowA`; Android adaptive mark in the 66 % zone (72/108 of the canvas, like the prototype's `x=18 width=72`); monochrome/notification bold in white (Android masks and tints them); favicon and Live Activity use the bold weight on the dark background; splash is the regular mark alone (Expo paints the background). The old `>_` window and the spark disappear from every file.
- **Banner text.** The SVG renderer behind `sharp` (librsvg + pango) only sees the fonts installed on the machine: neither a `FONTCONFIG_FILE` pointing at the bundled Google Fonts nor `sharp`'s `text.fontfile` made "JetBrains Mono" resolve on macOS (both were tried; the text fell back to a sans). So the script converts every text run to outlines with `opentype.js` (new devDependency of the app, pure JS) from the `.ttf` files in `@expo-google-fonts/jetbrains-mono`, which also gives exact advance widths for the chips. The result is identical on every machine that ran `pnpm install`. The chips reuse the agent colors from the prototype (`#D97757`, `#2FBF8F`).
- **Where files live.** App assets stay in `apps/mobile/assets/` (paths referenced by `app.config.ts` and the installer). The brand banner goes to `docs/brand/og.png` (referenced by both READMEs; the landing will copy or serve it). The Linux symbolic SVG is written by the same script next to its consumer, `apps/daemon/tray/linux/remote-harness-symbolic.svg`, so there is still one source for the mark.
- **macOS glyph** drawn in Swift with `NSBezierPath` at 18×18 pt from the bold mark's geometry (scaled from 256), as a template image (`isTemplate = true`) so macOS tints it for light/dark menu bars. No PDF resource to locate or copy: the helper is a single compiled file and stays that way.
- **Linux glyph.** `indicator.set_icon_theme_path(<dir of tray.py>)` + `set_icon_full('remote-harness-symbolic', …)` when the SVG exists; `utilities-terminal` otherwise. AppIndicator looks icons up by name in the theme path.
- **Setup banner.** The icon art is 12 rows × 14 columns (the Tether in half-blocks: nodes muted, reins and ring accent) so that, with REMOTE / HARNESS in the same block font (HARNESS is 62 columns), `BANNER_WIDTH` stays at 78 and the logo still shows on 80-column terminals. The palette accent becomes `#E8A33D`; the welcome glyph is `◎` (a ring, like the mark). `BANNER_WIDTH` keeps driving the welcome box, so the existing width test still holds.

## Risks / Trade-offs

- A machine without `swiftc` keeps the headless daemon as before; the glyph change only matters where the helper compiles.
- librsvg's text rendering (kerning, hinting) differs slightly from a browser; the banner is checked visually after generation.
- Linux panels vary: a symbolic SVG looks right on GNOME/KDE themes that recolor symbolic icons; elsewhere it shows as a light-gray glyph, which still reads on dark and most light panels.
