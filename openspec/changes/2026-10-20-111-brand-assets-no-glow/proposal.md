## Why

The amber radial glow drawn behind the Tether mark in `apps/mobile/scripts/icons.mts` (`backdrop()`'s `glow` layer, plus the extra `og-mark-glow`/`fg-mark-glow` layers in the banner and the Google Play feature graphic) makes the mark look blurry and muddy at the small sizes the app icon renders at (29/40/60 pt, Android adaptive mask). The README/Open Graph banner also still shows the agent chips as two-letter color codes (`cl`, `cx`) left over from before #226, and its tagline and chip labels are too small to read once GitHub scales the 720 px-wide image down (#227).

## What Changes

- **No glow.** `backdrop()` drops its `glow` option; `iconSvg()` (app icon, favicon, Live Activity icon) renders flat background + mark, nothing else. The banner (`bannerSvg`) and the Google Play feature graphic (`featureGraphicSvg`) drop their own extra mark-centered glow layer. The adaptive icon, its monochrome variant, the splash and the Linux tray glyph never had a glow and are unaffected.
- **Chips get a mark instead of a letter code.** `AGENT_CODES`-style two-letter boxes (`cl`, `cx`) in the banner are replaced with small monochrome glyphs (simple geometric strokes, same technique as the Tether mark itself: an asterisk-like mark for Claude Code, a six-node ring for Codex) drawn in ink color on the agent-colored tile. This keeps the banner self-contained (one script, no binary logo assets) while issue #226 (official brand assets for the in-app `AgentBadge`, with documented license terms) is still open; the banner can switch to #226's assets once they land, without this change blocking on it.
- **Bigger, higher-contrast banner text.** The tagline and chip label sizes increase (23 → 27 and 20 → 23 px) so they stay legible at the README's 720 px display width and in the 1200×630 Open Graph preview; chip label color moves from muted to the main text color for better contrast against the dark background.
- Regenerate every asset via `pnpm --filter @remote-harness/mobile icons` (`apps/mobile/assets/*`, `docs/brand/og.png`, `apps/mobile/store/feature-graphic.*`) — nothing is hand-edited.

## Capabilities

### Modified Capabilities
- `product-identity`: the "Brand mark" requirement now says the mark renders flat (no glow) in every generated asset, and the brand banner's agent chips use a drawn glyph instead of a letter code.

## Impact

- `apps/mobile/scripts/icons.mts` (backdrop, bannerSvg, featureGraphicSvg).
- Regenerated: `apps/mobile/assets/icon.png`, `favicon.png`, `live-activity-icon.png`, `docs/brand/og.png`, `apps/mobile/store/feature-graphic.{svg,png}`. `adaptive-icon*.png`, `splash-icon.png` and the Linux tray SVG are regenerated too but unchanged (no glow to remove).
- No protocol, daemon or i18n change.
