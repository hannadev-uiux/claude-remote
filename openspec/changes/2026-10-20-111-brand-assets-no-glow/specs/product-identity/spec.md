## MODIFIED Requirements

### Requirement: Brand mark
The product mark SHALL be "the Tether": three reins from three terminal nodes meeting in one ring, in two weights (regular for the app icon, splash, README and web; bold under 24 px: menu bar, notification icon, favicon, Live Activity). The mark SHALL be defined once in `apps/mobile/scripts/icons.mts` and every brand asset SHALL be generated from it: the app assets, the brand banner `docs/brand/og.png` (1200×630, mark, product name, tagline and agent chips, in JetBrains Mono) used as the README header, the macOS menu bar glyph (a template image drawn from the bold mark) and the Linux tray icon (a symbolic SVG of the bold mark). The installer and setup banner SHALL draw the mark in block characters next to the words REMOTE / HARNESS, in the amber accent, and MUST fit an 80-column terminal. No brand asset MAY show the Claude spark. No generated asset MAY draw a glow or shadow behind the mark: the app icon, the favicon, the Live Activity icon, the brand banner and the Google Play feature graphic SHALL render a flat background plus the mark, nothing else. The brand banner's agent chips SHALL show a small drawn glyph for each agent instead of a two-letter code, and its tagline and chip labels SHALL stay legible at the README's 720 px display width.

#### Scenario: macOS menu bar
- **WHEN** the daemon's tray helper runs on macOS
- **THEN** the status item shows the bold Tether mark as a template image, tinted by the system for light and dark menu bars

#### Scenario: Setup banner
- **WHEN** the setup wizard starts in an 80-column terminal
- **THEN** it prints the block-character Tether next to REMOTE / HARNESS, with the reins and ring in amber

#### Scenario: README header
- **WHEN** the repository README is opened on GitHub
- **THEN** its header is the brand banner with the mark, the name and the agent chips, with no glow behind the mark and legible tagline and chip text at 720 px wide

#### Scenario: App icon at small sizes
- **WHEN** the app icon is rendered at 29pt, 40pt or 60pt, or inside the Android adaptive icon mask
- **THEN** only the flat background and the mark are visible, with no glow softening its edges
