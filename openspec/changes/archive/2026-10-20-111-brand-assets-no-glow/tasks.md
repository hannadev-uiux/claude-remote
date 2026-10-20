## 1. Icons script

- [x] 1.1 `backdrop()`: drop the `glow` parameter and its radial gradient; `iconSvg()` renders flat background + mark
- [x] 1.2 `bannerSvg()` / `featureGraphicSvg()`: remove the extra mark-centered glow layer (`og-mark-glow`, `fg-mark-glow`)
- [x] 1.3 Banner chips: replace the `cl`/`cx` two-letter codes with a small drawn glyph per agent (asterisk for Claude Code, six-node ring for Codex), same ink-on-tile technique
- [x] 1.4 Banner text: bigger tagline and chip labels, chip label color moved to the main text token for contrast

## 2. Regenerate and verify

- [x] 2.1 `pnpm --filter @remote-harness/mobile icons`; review `apps/mobile/assets/icon.png`, `docs/brand/og.png` and `apps/mobile/store/feature-graphic.png` visually (no glow, chips readable, text legible at 720px)
- [x] 2.2 `pnpm check` green (typecheck, tests, `npx biome check apps packages`)
