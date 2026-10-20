# app-shell Specification

## Purpose
Provides the foundation of the mobile app: terminal visual identity, navigation and a resilient connection to the daemon.

## Requirements

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

### Requirement: Authenticated connection
When starting with paired credentials, the app SHALL connect to the daemon and send `auth` as the first message; without credentials, it MUST open the pairing screen.

#### Scenario: Not paired
- **WHEN** the app opens for the first time
- **THEN** the pairing screen is shown

### Requirement: Automatic reconnection
When the connection is lost, the app SHALL try to reconnect with exponential backoff (1 s up to 30 s), reconnect immediately when returning to the foreground, and resubscribe to open sessions with the last cursor received. A connection attempt that has not opened after 10 s SHALL be abandoned and counted as unreachable; while reconnecting after an unreachable attempt, the indicator MUST say the computer may be asleep or offline.

#### Scenario: Network change
- **WHEN** the phone switches from Wi-Fi to 4G
- **THEN** the app reconnects and the conversation continues from where it left off, without duplicate messages

#### Scenario: Connection indicator
- **WHEN** the connection drops
- **THEN** the app shows the "reconnecting" state at the top

#### Scenario: Computer asleep
- **WHEN** the computer went to sleep and connection attempts get no answer
- **THEN** the indicator says the computer is not answering and may be asleep or offline, and the app reconnects by itself once it wakes

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

### Requirement: Agent colors
The app SHALL define fixed colors for the agents, independent of the theme: Claude Code `#D97757`, Codex `#2FBF8F`, Kimi `#5B9BF5`, Qwen `#8C6CF5`. Model providers (OpenRouter) SHALL be shown with a neutral outline and MUST NOT get a color of their own. Agents and providers with an icon registered (`src/ui/agent-icons/`) SHALL show that icon in the agent badge (drawn in the agent's color) or the provider chip (drawn in the chip's neutral color) instead of the agent badge's two-letter code; an agent or provider without a registered icon MUST keep the two-letter code / text-only chip, so a future agent id never goes unrepresented.

#### Scenario: Agent color across themes
- **WHEN** the theme changes
- **THEN** the color that identifies Claude Code stays `#D97757`

#### Scenario: Agent badge shows its icon
- **WHEN** a session's profile uses Claude Code
- **THEN** its agent badge shows the Claude Code icon drawn in `#D97757`, not the `cl` code

#### Scenario: Provider chip shows its icon
- **WHEN** a profile routes through OpenRouter
- **THEN** its `via OpenRouter` chip shows the OpenRouter icon next to the text

#### Scenario: Unregistered agent falls back to the letter code
- **WHEN** an agent id has no icon registered in `src/ui/agent-icons/`
- **THEN** its badge keeps showing the two-letter code, exactly as before this change

### Requirement: Theme palettes
The app SHALL ship five palettes, each defining every semantic token and the 16 ANSI colors: Dark (default; background `#0D0D0D`, accent `#E8A33D`), Light (background `#F3F3F1`, accent `#E8A33D`, `accentText #A0640A`), Dracula (background `#282A36`, accent `#BD93F9`, official terminal colors), Catppuccin Mocha (background `#1E1E2E`, accent `#FAB387`, official terminal colors) and Catppuccin Latte (background `#E6E9EF`, accent `#FE640B`, `accentText #D14F00`, official terminal colors). In every palette `text` MUST reach a 4.5:1 contrast ratio over `background`, `surface` and `surfaceRaised`, and `textMuted` and `accentText` MUST reach 3:1 over `background` and `surface`. Agent colors MUST NOT change with the theme.

#### Scenario: Body text contrast
- **WHEN** the palette test runs
- **THEN** every theme's `text` over its three surfaces measures at least 4.5:1

#### Scenario: Latte accent as text
- **WHEN** a label is drawn in `accentText` on the Catppuccin Latte surface
- **THEN** it uses `#D14F00`, not the `#FE640B` fill, and reads at 3:1 or better

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
With a hardware keyboard, on every layout (phones and tablets, iOS and Android; on Android Ctrl stands for ⌘ and only shortcuts on letters, digits, arrows, Enter and Esc reach the app), besides ⌘N (new session), ⌘, (settings) and ⌘⏎ (send now), the app SHALL offer: ⌘1 to ⌘9 to open the nth session of the list in its current order; ⌘K or ⌘F to focus the session search (returning to the list on phones); ⌘T to open the open session's terminal (the inspector's Terminal tab on tablets, the terminal screen on phones); ⌘. to send Esc to the open session; ⌘⇧M to cycle its permission mode through default, accept edits and plan (never auto, which needs its confirmation); ⌘A / ⌘D to allow or deny the oldest pending tool permission of the open session; ⌘↑ / ⌘↓ (and ⌥⌘↑ / ⌥⌘↓) to open the previous / next session of the list from inside a session, without wrapping and keeping the list as the screen "back" returns to; ⌘⇧O to open the open session's More options menu; ⌘L to focus its message input; and ⌘/ to open a translated **Keyboard shortcuts** sheet listing all of them, closed by Esc or ⌘/ again. ⌘A, ⌘D, ⌘↑ and ⌘↓ MUST do nothing while a text field is focused.

Esc SHALL go back: from a session to the list, from any other pushed screen one step back, and close the open sheet or menu first when there is one. While a text field is focused, Esc SHALL first close the composer's suggestions when they are open, else blur the field; the next Esc goes back. On the raw terminal screen Esc MUST NOT be taken (it belongs to the terminal); ⌘[ SHALL go back from any screen, the terminal included, even with a focused field.

While the session list is the visible screen (the phone's list, or the tablet's sidebar), ↑ / ↓ SHALL move a visible focus ring between sessions, scrolling to keep it in view, and Enter SHALL open the selected session; these keys MUST do nothing while a text field is focused. In the More options menu drawn by the app (Android), ↑ / ↓ SHALL move between the enabled items, Enter SHALL choose and Esc SHALL close; the iOS system sheet keeps its own keyboard handling.

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

#### Scenario: Back to the list on a phone
- **WHEN** a session is open on a phone, no field is focused and the user presses Esc
- **THEN** the session list is shown

#### Scenario: Esc in the composer
- **WHEN** the composer is focused without suggestions and the user presses Esc twice
- **THEN** the first Esc blurs the composer and the second returns to the list

#### Scenario: Esc closes suggestions first
- **WHEN** the composer shows the `@` file suggestions and the user presses Esc
- **THEN** the suggestions close and the composer keeps its focus

#### Scenario: Terminal keeps Esc
- **WHEN** the raw terminal screen is open and the user presses Esc
- **THEN** the app stays on the terminal; ⌘[ returns to the session

#### Scenario: Arrows on a phone
- **WHEN** the phone shows the list with three sessions, no field is focused and the user presses ↓, ↓, Enter
- **THEN** the focus ring moves to the second session and Enter opens it

#### Scenario: Next session
- **WHEN** the second of three listed sessions is open, no field is focused and the user presses ⌘↓
- **THEN** the third session opens in its place and Esc returns to the list

#### Scenario: Last session
- **WHEN** the last listed session is open and the user presses ⌘↓
- **THEN** nothing changes

#### Scenario: More options from the keyboard
- **WHEN** a session is open and the user presses ⌘⇧O
- **THEN** its More options menu opens

#### Scenario: Focus the input
- **WHEN** a session is open and the user presses ⌘L
- **THEN** the message input is focused

#### Scenario: Shortcuts sheet
- **WHEN** the user presses ⌘/
- **THEN** the Keyboard shortcuts sheet lists the shortcuts with translated labels, and Esc closes it

### Requirement: Edge swipe for the tablet sidebar
In the two-column class in portrait (overlay sidebar), a rightward swipe starting at the left edge of the window, below the header, SHALL open the session list. The list follows the finger and, on release, stays open past half its width or after a quick rightward flick; otherwise it slides back. With the list open, a leftward swipe on the dimmed area SHALL close it, following the finger, and a tap there SHALL still close it. Opening and closing SHALL slide, instantly when the system's reduced motion is on.

The edge swipe SHALL only exist on the list and on a session's conversation, where ☰ replaces the back button; there, the stack's back swipe MUST be off in this layout. Deeper screens (terminal, subagent, settings) MUST keep their back swipe and get no edge swipe, and phones MUST NOT get it at all. Swipes on the list's rows MUST keep their swipe actions.

#### Scenario: Open with the edge swipe
- **WHEN** an iPad in portrait shows a session's conversation and the user drags from the left edge 250 points to the right and lifts the finger
- **THEN** the list stays open over the dimmed conversation

#### Scenario: Short drag
- **WHEN** the user drags from the left edge 100 points slowly and lifts the finger
- **THEN** the list slides back and stays closed

#### Scenario: Close with a swipe
- **WHEN** the list is open and the user swipes left on the dimmed conversation
- **THEN** the list follows the finger and closes

#### Scenario: Phone back gesture
- **WHEN** the app runs on a phone and the user swipes from the left edge on a session
- **THEN** the stack goes back as before

#### Scenario: Reduced motion
- **WHEN** reduced motion is on and the user taps ☰
- **THEN** the list appears without the slide animation

### Requirement: Back navigation
The session list SHALL always be the first screen of the app's main stack, including when a link, a Live Activity or a notification opens another screen, and it MUST NOT show a back button. Every other screen SHALL show the stack's back button, which returns to the previous screen. The only exception is the portrait tablet layout, where ☰ replaces it on the list and on a session's conversation only. Opening a session SHALL do nothing when its conversation is already shown, SHALL replace the conversation of another session when one is shown, and SHALL be pushed otherwise, so back from a conversation never walks through earlier sessions.

#### Scenario: Session opened from a link
- **WHEN** the app starts from a Live Activity link to a session
- **THEN** the conversation shows a back button that returns to the list

#### Scenario: Back to the list
- **WHEN** a session was opened from a link and the user presses ⌘F on a phone
- **THEN** the list is shown without a back button

#### Scenario: Switching sessions in the sidebar
- **WHEN** a tablet shows session A and the user picks session B in the sidebar
- **THEN** B replaces A, and back from B leads to the screen before A

#### Scenario: Terminal on a portrait tablet
- **WHEN** an iPad in portrait opens a session's terminal
- **THEN** the terminal shows the back button, not ☰

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
