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

### Requirement: Agent colors
The app SHALL define fixed colors for the agents, independent of the theme: Claude Code `#D97757`, Codex `#2FBF8F`, Kimi `#5B9BF5`, Qwen `#8C6CF5`. Model providers (OpenRouter) SHALL be shown with a neutral outline and MUST NOT get a color of their own.

#### Scenario: Agent color across themes
- **WHEN** the theme changes
- **THEN** the color that identifies Claude Code stays `#D97757`

### Requirement: Theme palettes
The app SHALL ship five palettes, each defining every semantic token and the 16 ANSI colors: Dark (default; background `#0D0D0D`, accent `#E8A33D`), Light (background `#F3F3F1`, accent `#E8A33D`, `accentText #A0640A`), Dracula (background `#282A36`, accent `#BD93F9`, official terminal colors), Catppuccin Mocha (background `#1E1E2E`, accent `#FAB387`, official terminal colors) and Catppuccin Latte (background `#E6E9EF`, accent `#FE640B`, `accentText #D14F00`, official terminal colors). In every palette `text` MUST reach a 4.5:1 contrast ratio over `background`, `surface` and `surfaceRaised`, and `textMuted` and `accentText` MUST reach 3:1 over `background` and `surface`. Agent colors MUST NOT change with the theme.

#### Scenario: Body text contrast
- **WHEN** the palette test runs
- **THEN** every theme's `text` over its three surfaces measures at least 4.5:1

#### Scenario: Latte accent as text
- **WHEN** a label is drawn in `accentText` on the Catppuccin Latte surface
- **THEN** it uses `#D14F00`, not the `#FE640B` fill, and reads at 3:1 or better

### Requirement: Settings screen
The settings screen SHALL be organized as: **Machine** (the connection pill; the machine name, the alias when set else the daemon's hostname, with an Edit action that saves or clears the alias; one line `host:port · remote-harness <daemon version> · protocol <n>` leaving unknown parts out; `Forget this machine`), **Appearance** (theme swatches), **Profiles** (one row per profile with the agent badge, the name in the profile color, the dashed `via <provider>` chip when the profile has a provider, and `<agent> · <config dir> · alias <id>`; tapping opens a details sheet with the agent, the alias, the config dir, the profile's notifications toggle and, for a profile with a provider, the provider, its default model and the credits left, or the hint to run `remote-harness provider key <id>` when no key is stored), **Notifications** (`Push notifications` toggle for this phone with the hint "Only this phone · never the conversation", showing the push status and test while on; `Live status` toggle; a `Muted` row with `N profiles · M sessions` that opens a sheet with the per-profile switches and the muted sessions, each unmutable), **Voice** (transcription language) and **App** (version, update and channel, `Check for updates`, `Documentation`, `Report a problem`). All texts MUST be translated.

#### Scenario: Rename the machine
- **WHEN** the user taps Edit on the Machine card, types "MacBook Pro" and saves
- **THEN** the card and every `{{machine}}` text show "MacBook Pro" until the alias is cleared

#### Scenario: Profile row
- **WHEN** the profile "Personal" uses `~/.claude` and alias `personal`
- **THEN** its row shows the Claude Code badge, "Personal" and `Claude Code · ~/.claude · alias personal`, and tapping it opens the details with the notifications toggle

#### Scenario: OpenRouter profile details
- **WHEN** the profile "Work" has provider OpenRouter with a stored key and $42.10 of credits left
- **THEN** its row shows the `via OpenRouter` chip and its details list the provider, the default model and `$42.10 left`

#### Scenario: Muted summary
- **WHEN** one profile and two sessions are muted
- **THEN** the Muted row reads "1 profile · 2 sessions" and its sheet lists them

### Requirement: Tablet layout
The app SHALL lay itself out by window width (points on iOS, dp on Android): below 700 the phone layout (one pane; Split View one third and Slide Over included); from 700 to 1099 two columns, the session list (340 wide) beside the conversation, with the inspector opening as a side sheet from a header button; from 1100 three columns, the list, the conversation (content at most 760 wide, the permission card and the queue sharing that width) and the inspector (320 wide by default). In the two-column class in portrait, the list SHALL instead slide over the dimmed conversation from a ☰ header button, opening on its own while no session is open and closing when one is picked. The inspector SHALL have the tabs **Terminal** (the live mirror of the pane), **Subagents** (with the count in the tab, the same rows as the subagents sheet) and **Details** (the same rows as the session details sheet), SHALL be resizable between 280 and 420 by dragging its edge, and SHALL remember its tab and width while the app runs. All texts MUST be translated.

#### Scenario: Landscape iPad
- **WHEN** the window is 1180 wide and a session is open
- **THEN** the list, the conversation and the inspector are shown side by side, the inspector on its last tab

#### Scenario: Portrait iPad
- **WHEN** the window is 820 wide and taller than wide
- **THEN** the conversation fills the window, ☰ slides the list over it, and the inspector opens as a side sheet from its header button

#### Scenario: Slide Over
- **WHEN** the window is 320 wide
- **THEN** the phone layout is used and no inspector button is shown

#### Scenario: Resize the inspector
- **WHEN** the user drags the inspector's edge 200 points to the left from its default width
- **THEN** the inspector is 420 wide, its maximum

### Requirement: Hardware keyboard shortcuts
With a hardware keyboard, besides ⌘N (new session), ⌘, (settings) and ⌘⏎ (send now), the app SHALL offer: ⌘1 to ⌘9 to open the nth session of the list in its current order; ⌘K to focus the session search (returning to the list on phones); ⌘T to open the open session's terminal (the inspector's Terminal tab on tablets, the terminal screen on phones); ⌘. to send Esc to the open session; ⌘⇧M to cycle its permission mode through default, accept edits and plan (never auto, which needs its confirmation); and ⌘A / ⌘D to allow or deny the oldest pending tool permission of the open session. ⌘A and ⌘D MUST do nothing while a text field is focused.

#### Scenario: Open the third session
- **WHEN** the user presses ⌘3 with five sessions listed
- **THEN** the third session of the list opens

#### Scenario: Answer from the keyboard
- **WHEN** a tool permission is pending in the open session, no field is focused and the user presses ⌘A
- **THEN** the app sends `permission.respond` `allow` for that request

#### Scenario: Select all keeps working
- **WHEN** the composer is focused and the user presses ⌘A
- **THEN** the text is selected and no permission is answered

#### Scenario: Cycle the mode
- **WHEN** the open session is in `acceptEdits` and the user presses ⌘⇧M
- **THEN** the app sends `session.setMode` `plan`
