## Why

The theme picker in Settings → Appearance renders one swatch per choice in a wrapping row (`AppearanceCard.tsx`), so the six labels ("System", "Dark", "Light", "Dracula", "Catppuccin Mocha", "Catppuccin Latte") break unevenly across two rows of differently sized tiles. The layout looks disorganized today and degrades further each time a theme is added. Issue #222 asks for a single, consistent pattern that scales with the theme count.

## What Changes

- Replace the row of swatch tiles in `AppearanceCard` with a single select row ("Theme · Dracula ›") that opens a modal with a scrollable list of every theme choice.
- Each row in the modal shows a fixed-size preview swatch, the theme name, a light/dark tag (from the theme's existing `scheme`), and a check mark on the selected choice; tapping a row applies that theme live and keeps the modal open so the preview can be compared, with a "Done" action to close it.
- "System" stays the first row and its subtitle names which theme it currently resolves to (e.g. "Dark" when the phone is in dark mode).
- The modal list scrolls instead of wrapping, so it keeps working unmodified as more themes are added later.
- Every row exposes an accessible label and selected state for VoiceOver/TalkBack.
- New i18n strings (theme tag, "Theme", "Done") added to all three catalogs (pt-BR, en-US, es-ES) with parity.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `app-shell`: the "Theme preference" requirement's description of how Settings offers the choice changes from wrapping swatches to a select row that opens a scrollable modal list; the "Settings screen" requirement's one-line description of the Appearance card changes from "theme swatches" to "a Theme row opening the picker".

## Impact

- `apps/mobile/src/features/settings/AppearanceCard.tsx`: replaced with a select row + modal list implementation.
- `apps/mobile/src/core/i18n/locales/{pt-BR,en-US,es-ES}.ts`: new strings for the picker (row label, light/dark tag, Done).
- No changes to `apps/mobile/src/core/theme` (palettes, resolution, store) — the existing `scheme` field and `setThemePreference` are reused as-is.
- No daemon or protocol impact.
