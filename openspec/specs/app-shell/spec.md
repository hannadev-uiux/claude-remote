# app-shell Specification

## Purpose
Provides the foundation of the mobile app: terminal visual identity, navigation and a resilient connection to the daemon.

## Requirements

### Requirement: App icon
The app SHALL have an icon with the Remote Harness mark (the Tether: three reins from three terminals meeting in one ring) in the amber accent over a dark gradient with a soft amber glow, generated from code by `apps/mobile/scripts/icons.mts` together with the splash image, the Android adaptive, themed and notification icons, the favicon and the Live Activity icon. Sizes under 24 px (notification, favicon, Live Activity, menu bar) SHALL use the bold weight of the mark. No asset MAY show the Claude spark or any other agent's symbol.

#### Scenario: iPhone home screen
- **WHEN** the app is installed
- **THEN** the icon shown is the amber Tether mark on the dark gradient

#### Scenario: Android themed icon
- **WHEN** the launcher applies a themed (monochrome) icon
- **THEN** the bold mark is used as the monochrome layer inside the adaptive safe zone

#### Scenario: Regenerating
- **WHEN** a developer runs `pnpm --filter @remote-harness/mobile icons`
- **THEN** every asset in `apps/mobile/assets` and the brand banner in `docs/brand` are rewritten from the same mark source

### Requirement: Authenticated connection
When starting with paired credentials, the app SHALL connect to the daemon and send `auth` as the first message; without credentials, it MUST open the pairing screen.

#### Scenario: Not paired
- **WHEN** the app opens for the first time
- **THEN** the pairing screen is shown

### Requirement: Automatic reconnection
When the connection is lost, the app SHALL try to reconnect with exponential backoff (1 s up to 30 s), reconnect immediately when returning to the foreground, and resubscribe to open sessions with the last cursor received.

#### Scenario: Network change
- **WHEN** the phone switches from Wi-Fi to 4G
- **THEN** the app reconnects and the conversation continues from where it left off, without duplicate messages

#### Scenario: Connection indicator
- **WHEN** the connection drops
- **THEN** the app shows the "reconnecting" state at the top

### Requirement: Requests with timeout
Requests SHALL be correlated by `id` and fail with an error after 15 s without a response.

#### Scenario: Daemon does not respond
- **WHEN** a request goes 15 s without a response
- **THEN** the promise is rejected with a timeout error

### Requirement: Theme tokens
The app SHALL define its colors as semantic tokens with the same names in every theme: `background`, `surface`, `surfaceRaised`, `border`, `borderStrong`, `text`, `textMuted`, `textDim`, `accent`, `accentText`, `accentInk`, `accentSoft`, `success`, `successSoft`, `warning`, `warningSoft`, `danger`, `dangerSoft`, `info`, `infoSoft`, `diffAdd`, `diffRemove`, `scrim`, `backdrop` and the 16 ANSI colors of the raw terminal. Every component, screen, the markdown renderer, the raw terminal, the status bar, the navigation header, menus and sheets MUST read colors from the current theme at render time; a hex color literal MUST NOT appear in the app source outside the theme module (generated files, tests and the Live Activity layout's fallbacks excepted). Text and icons in the accent color SHALL use `accentText`; fills, borders and dots SHALL use `accent`; text over an accent fill SHALL use `accentInk`.

#### Scenario: Default dark theme
- **WHEN** the app starts with no saved preference
- **THEN** it renders the dark theme: background `#0D0D0D`, text `#E8E6E3`, accent `#E8A33D`, warning `#F3DC7A`, monospaced font

#### Scenario: Palette parity
- **WHEN** a token is added to the theme type
- **THEN** every theme must define it with a valid `#RRGGBB` or `#RRGGBBAA` color, or the typecheck and the palette test fail

#### Scenario: Literal color outside the theme
- **WHEN** a component under `apps/mobile/src` uses a hex color literal outside `core/theme`
- **THEN** the color guard test fails

### Requirement: Theme preference
The app SHALL keep a theme preference on the device (`system` or a theme name, `system` by default) and resolve it with the system color scheme into one of the available themes. Changing the preference or the system scheme SHALL re-render every screen without restarting the app. The status bar style, the action sheet appearance, the markdown color scheme and the terminal theme SHALL follow the resolved theme.

#### Scenario: Only dark available
- **WHEN** the preference is `system` and the phone is in light mode but no light theme exists
- **THEN** the app renders the dark theme

#### Scenario: Live switch
- **WHEN** the resolved theme changes while a conversation and its terminal are open
- **THEN** both re-render with the new palette, including the xterm.js colors, without reopening them

### Requirement: Agent colors
The app SHALL define fixed colors for the agents, independent of the theme: Claude Code `#D97757`, Codex `#2FBF8F`, Kimi `#5B9BF5`, Qwen `#8C6CF5`. Model providers (OpenRouter) SHALL be shown with a neutral outline and MUST NOT get a color of their own.

#### Scenario: Agent color across themes
- **WHEN** the theme changes
- **THEN** the color that identifies Claude Code stays `#D97757`
