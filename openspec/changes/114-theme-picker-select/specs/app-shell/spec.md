## MODIFIED Requirements

### Requirement: Theme preference
The app SHALL keep a theme preference on the device (`system` or one of `dark`, `light`, `dracula`, `mocha`, `latte`; `system` by default) and resolve it with the system color scheme: `system` gives `light` when the phone is in light mode and `dark` otherwise. Settings SHALL offer the choice as a single row naming the resolved theme ("Theme · Dracula") that opens a modal with a scrollable list of every choice (System first), each row showing a fixed-size preview swatch, the theme's name, a light/dark tag and a check mark on the selected choice; the System row's subtitle SHALL name which theme it currently resolves to. Tapping a row SHALL apply that theme immediately while the modal stays open, so the live preview can be compared against other choices, and a "Done" action SHALL close it. Changing the preference or the system scheme SHALL re-render every screen without restarting the app. The status bar style, the action sheet appearance, the markdown color scheme and the terminal theme SHALL follow the resolved theme, and with an explicit theme the app SHALL set the native color scheme to the theme's so alerts and the keyboard match; with `system` it MUST leave the native scheme to the phone. Theme names and the light/dark tag SHALL be translated (pt-BR, en-US, es-ES).

#### Scenario: System follows the phone
- **WHEN** the preference is `system` and the phone switches to light mode
- **THEN** the app renders the light theme at once

#### Scenario: Only dark available
- **WHEN** the preference is `dark` and the phone switches to light mode
- **THEN** the app keeps the dark theme (an explicit choice ignores the system scheme)

#### Scenario: Picking Dracula
- **WHEN** the user opens the Theme row and taps the Dracula row in the list
- **THEN** every open screen, the terminal and the sheets switch to the Dracula palette, the choice is restored on the next launch, and system alerts come up dark

#### Scenario: Live switch
- **WHEN** the resolved theme changes while a conversation and its terminal are open
- **THEN** both re-render with the new palette, including the xterm.js colors, without reopening them

#### Scenario: Comparing themes before closing
- **WHEN** the user taps Light and then Dracula inside the open theme list without tapping Done
- **THEN** the app renders Light and then Dracula in turn, and the check mark follows the last tapped row

#### Scenario: Theme row label
- **WHEN** the resolved theme is Catppuccin Mocha
- **THEN** the Appearance card's Theme row reads "Theme · Catppuccin Mocha"

### Requirement: Settings screen
The settings screen SHALL be organized as: **Machine** (the connection pill; the machine name, the alias when set else the daemon's hostname, with an Edit action that saves or clears the alias; one line `host:port · remote-harness <daemon version> · protocol <n>` leaving unknown parts out; `Forget this machine`), **Appearance** (a Theme row naming the resolved theme that opens the theme picker modal), **Profiles** (one row per profile with the agent badge, the name in the profile color, the dashed `via <provider>` chip when the profile has a provider, and `<agent> · <config dir> · alias <id>`; tapping opens a details sheet with the agent, the alias, the config dir, the profile's notifications toggle and, for a profile with a provider, the provider, its default model and the credits left, or the hint to run `remote-harness provider key <id>` when no key is stored), **New session** (`Open the session after creating it` toggle, on by default, per device), **Keyboard** (`Return key sends` toggle, off by default, per device, with the hint that the on-screen keyboard then has no new line), **Notifications** (`Push notifications` toggle for this phone with the hint "Only this phone · never the conversation", showing the push status and test while on; `Live status` toggle; a `Muted` row with `N profiles · M sessions` that opens a sheet with the per-profile switches and the muted sessions, each unmutable), **Permissions** (opens the Permissions screen, which lists every system permission the app and the computer rely on, its status, why it's needed, and how to fix it), **Daemon** (the daemon version and update channel with a `main` / `development` selector, `Check for updates`, the available version, `Update the computer` after a confirmation that warns about a downgrade and about busy sessions, the run progress and its outcome; for a daemon without remote updates, the `remote-harness update` command), **Voice** (transcription language) and **App** (version, update and channel, `Check for updates`, `Documentation`, `Report a problem`). All texts MUST be translated.

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

#### Scenario: Update the computer
- **WHEN** the daemon reports 0.13.0 available on `main` and the user confirms "Update the computer"
- **THEN** the card shows fetching, building and restarting, reconnects and shows 0.13.0

#### Scenario: Turn off auto-open
- **WHEN** the user turns off "Open the session after creating it"
- **THEN** the choice is kept on this device across restarts, and the next successful `Start session` returns to the session list instead of opening the new session

#### Scenario: Open Permissions
- **WHEN** the user taps the Permissions entry
- **THEN** the Permissions screen opens, showing the "On this phone" and "On this computer" sections

#### Scenario: Return key sends
- **WHEN** the user turns on "Return key sends"
- **THEN** the choice is kept on this device across restarts, and the composer's on-screen return key sends
