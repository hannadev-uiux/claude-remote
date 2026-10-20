## MODIFIED Requirements

### Requirement: App icon
The app SHALL have an icon with the Remote Harness mark (the Tether: three reins from three terminals meeting in one ring) in the amber accent over a dark gradient with a soft amber glow, generated from code by `apps/mobile/scripts/icons.mts` together with the splash image, the Android adaptive, themed and notification icons, the favicon and the Live Activity icon. Sizes under 24 px (notification, favicon, Live Activity, menu bar) SHALL use the bold weight of the mark. No asset MAY show the Claude spark or any other agent's symbol. The same script SHALL also generate one flat (no glow) alternate app icon per theme — background and mark in that theme's colors — for "App icon follows the theme" below.

#### Scenario: iPhone home screen
- **WHEN** the app is installed
- **THEN** the icon shown is the amber Tether mark on the dark gradient

#### Scenario: Android themed icon
- **WHEN** the launcher applies a themed (monochrome) icon
- **THEN** the bold mark is used as the monochrome layer inside the adaptive safe zone

#### Scenario: Regenerating
- **WHEN** a developer runs `pnpm --filter @remote-harness/mobile icons`
- **THEN** every asset in `apps/mobile/assets` (including the per-theme alternate icons) and the brand banner in `docs/brand` are rewritten from the same mark source

### Requirement: Settings screen
The settings screen SHALL be organized as: **Machine** (the connection pill; the machine name, the alias when set else the daemon's hostname, with an Edit action that saves or clears the alias; one line `host:port · remote-harness <daemon version> · protocol <n>` leaving unknown parts out; `Forget this machine`), **Appearance** (a Theme row naming the resolved theme that opens the theme picker modal), **App icon** (an App icon row naming the current choice that opens the icon picker modal — Match theme, Original, and one per theme; see "App icon follows the theme"), **Profiles** (one row per profile with the agent badge, the name in the profile color, the dashed `via <provider>` chip when the profile has a provider, and `<agent> · <config dir> · alias <id>`; tapping opens a details sheet with the agent, the alias, the config dir, the profile's notifications toggle and, for a profile with a provider, the provider, its default model and the credits left, or the hint to run `remote-harness provider key <id>` when no key is stored), **New session** (`Open the session after creating it` toggle, on by default, per device), **Keyboard** (`Return key sends` toggle, off by default, per device, with the hint that the on-screen keyboard then has no new line), **Notifications** (`Push notifications` toggle for this phone with the hint "Only this phone · never the conversation", showing the push status and test while on; `Live status` toggle; a `Muted` row with `N profiles · M sessions` that opens a sheet with the per-profile switches and the muted sessions, each unmutable), **Permissions** (opens the Permissions screen, which lists every system permission the app and the computer rely on, its status, why it's needed, and how to fix it), **Daemon** (the daemon version and update channel with a `main` / `development` selector, `Check for updates`, the available version, `Update the computer` after a confirmation that warns about a downgrade and about busy sessions, the run progress and its outcome; for a daemon without remote updates, the `remote-harness update` command), **Voice** (transcription language) and **App** (version, update and channel, `Check for updates`, `Documentation`, `Report a problem`). All texts MUST be translated.

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

## ADDED Requirements

### Requirement: App icon follows the theme
The app SHALL offer one alternate app icon per theme (Dark, Light, Dracula, Catppuccin Mocha, Catppuccin Latte — the same flat, glow-free artwork as "App icon"), selectable independently of the in-app theme through a device-only preference: **Match theme** (default; the home-screen icon follows the resolved theme and switches when it changes), **Original** (the default icon, whatever the theme), or one specific theme's icon (**Custom**). Settings → App icon SHALL show an App icon row naming the current choice, opening a modal with a scrollable list of every choice (Match theme first, then Original and one per theme), each row showing a preview of the icon it applies and a check mark on the selected one; "Match theme"'s row previews the icon the resolved theme currently gives it. On iOS the icon SHALL change as soon as the preference or the resolved theme changes (the OS shows its own confirmation alert on every change, so the app MUST NOT change it on a timer or any other repeated trigger). On Android the change SHALL be deferred until the app goes to the background, since switching the active launcher activity can take a moment and may close the app on some launchers. Devices that do not support alternate icons SHALL keep the default icon regardless of the preference.

#### Scenario: Default behavior
- **WHEN** the app is installed and the user has not changed Settings → App icon
- **THEN** the preference is "Match theme" and the home-screen icon matches the resolved theme

#### Scenario: Switching theme with Match theme
- **WHEN** the preference is "Match theme" and the user switches the app's theme to Catppuccin Mocha
- **THEN** the home-screen icon becomes the Catppuccin Mocha icon (on iOS right away with the system confirmation; on Android once the app is backgrounded)

#### Scenario: Original regardless of theme
- **WHEN** the preference is "Original" and the user switches themes
- **THEN** the home-screen icon stays the default Tether mark on the dark gradient

#### Scenario: Picking a specific icon
- **WHEN** the user opens the App icon row and taps the Dracula row in the list
- **THEN** the home-screen icon becomes the Dracula icon and stays that way even if the app's theme later changes

#### Scenario: Unsupported device
- **WHEN** the device does not support alternate app icons
- **THEN** Settings → App icon has no effect and the default icon keeps showing
