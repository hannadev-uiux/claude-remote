## MODIFIED Requirements

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
