## MODIFIED Requirements

### Requirement: Theme preference
The app SHALL keep a theme preference on the device (`system` or one of `dark`, `light`, `dracula`, `mocha`, `latte`; `system` by default) and resolve it with the system color scheme: `system` gives `light` when the phone is in light mode and `dark` otherwise. Settings SHALL offer the choice as swatches (System, Dark, Light, Dracula, Catppuccin Mocha, Catppuccin Latte), each previewing its background, accent, text and border, with the current one marked. Changing the preference or the system scheme SHALL re-render every screen without restarting the app. The status bar style, the action sheet appearance, the markdown color scheme and the terminal theme SHALL follow the resolved theme, and with an explicit theme the app SHALL set the native color scheme to the theme's so alerts and the keyboard match; with `system` it MUST leave the native scheme to the phone. Theme names SHALL be translated (pt-BR, en-US, es-ES).

#### Scenario: System follows the phone
- **WHEN** the preference is `system` and the phone switches to light mode
- **THEN** the app renders the light theme at once

#### Scenario: Only dark available
- **WHEN** the preference is `dark` and the phone switches to light mode
- **THEN** the app keeps the dark theme (an explicit choice ignores the system scheme)

#### Scenario: Picking Dracula
- **WHEN** the user taps the Dracula swatch in Settings
- **THEN** every open screen, the terminal and the sheets switch to the Dracula palette, the choice is restored on the next launch, and system alerts come up dark

#### Scenario: Live switch
- **WHEN** the resolved theme changes while a conversation and its terminal are open
- **THEN** both re-render with the new palette, including the xterm.js colors, without reopening them

## ADDED Requirements

### Requirement: Theme palettes
The app SHALL ship five palettes, each defining every semantic token and the 16 ANSI colors: Dark (default; background `#0D0D0D`, accent `#E8A33D`), Light (background `#F3F3F1`, accent `#E8A33D`, `accentText #A0640A`), Dracula (background `#282A36`, accent `#BD93F9`, official terminal colors), Catppuccin Mocha (background `#1E1E2E`, accent `#FAB387`, official terminal colors) and Catppuccin Latte (background `#E6E9EF`, accent `#FE640B`, `accentText #D14F00`, official terminal colors). In every palette `text` MUST reach a 4.5:1 contrast ratio over `background`, `surface` and `surfaceRaised`, and `textMuted` and `accentText` MUST reach 3:1 over `background` and `surface`. Agent colors MUST NOT change with the theme.

#### Scenario: Body text contrast
- **WHEN** the palette test runs
- **THEN** every theme's `text` over its three surfaces measures at least 4.5:1

#### Scenario: Latte accent as text
- **WHEN** a label is drawn in `accentText` on the Catppuccin Latte surface
- **THEN** it uses `#D14F00`, not the `#FE640B` fill, and reads at 3:1 or better
