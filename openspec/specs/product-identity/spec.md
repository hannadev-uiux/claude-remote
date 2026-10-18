# product-identity Specification

## Purpose
TBD - created by archiving change 33-remote-harness-rename. Update Purpose after archive.

## Requirements

### Requirement: Product name
Every user-facing text of the app, the daemon CLI, the installers and the push notifications SHALL name the product "Remote Harness".

#### Scenario: CLI help
- **WHEN** the user runs `remote-harness --help`
- **THEN** the description names Remote Harness

### Requirement: CLI command and alias
The daemon CLI SHALL be installed as `remote-harness` and MUST keep `claude-remote` as an alias that runs the same commands.

#### Scenario: Old command
- **WHEN** the user runs `claude-remote update` after updating
- **THEN** the update runs as with `remote-harness update`

### Requirement: Environment variables
Every `REMOTE_HARNESS_<NAME>` variable SHALL take precedence; when it is unset, the matching `CLAUDE_REMOTE_<NAME>` MUST be used.

#### Scenario: Legacy variable
- **WHEN** only `CLAUDE_REMOTE_HOME=/tmp/x` is set
- **THEN** the daemon uses `/tmp/x` as its data directory

### Requirement: Data directory
The data directory SHALL be the `REMOTE_HARNESS_HOME` (or `CLAUDE_REMOTE_HOME`) override, else `~/.remote-harness` when it exists, else `~/.claude-remote` when it exists, else `~/.remote-harness`. Existing data MUST NOT be moved.

#### Scenario: Existing install
- **WHEN** only `~/.claude-remote` exists
- **THEN** the daemon keeps reading and writing `~/.claude-remote`

#### Scenario: New install
- **WHEN** neither directory exists
- **THEN** the daemon uses `~/.remote-harness`

### Requirement: Product accent and agent colors
Amber `#E8A33D` SHALL be the product accent of Remote Harness in the app, the notifications and the brand surfaces. Claude orange `#D97757` SHALL identify the Claude Code agent only, next to the other agents' colors (Codex `#2FBF8F`, Kimi `#5B9BF5`, Qwen `#8C6CF5`), and MUST NOT be used as the product accent. The warning color SHALL be `#F3DC7A`, distinct from the accent, so a waiting state never reads as the brand color.

#### Scenario: Running and waiting sessions
- **WHEN** one session is running and another waits for a permission
- **THEN** the running state uses the amber accent and the waiting state uses the warning yellow

#### Scenario: Android notification accent
- **WHEN** a push notification is shown on Android
- **THEN** its accent color is amber

### Requirement: Brand mark
The product mark SHALL be "the Tether": three reins from three terminal nodes meeting in one ring, in two weights (regular for the app icon, splash, README and web; bold under 24 px: menu bar, notification icon, favicon, Live Activity). The mark SHALL be defined once in `apps/mobile/scripts/icons.mts` and every brand asset SHALL be generated from it: the app assets, the brand banner `docs/brand/og.png` (1200×630, mark, product name, tagline and agent chips, in JetBrains Mono) used as the README header, the macOS menu bar glyph (a template image drawn from the bold mark) and the Linux tray icon (a symbolic SVG of the bold mark). The installer and setup banner SHALL draw the mark in block characters next to the words REMOTE / HARNESS, in the amber accent, and MUST fit an 80-column terminal. No brand asset MAY show the Claude spark.

#### Scenario: macOS menu bar
- **WHEN** the daemon's tray helper runs on macOS
- **THEN** the status item shows the bold Tether mark as a template image, tinted by the system for light and dark menu bars

#### Scenario: Setup banner
- **WHEN** the setup wizard starts in an 80-column terminal
- **THEN** it prints the block-character Tether next to REMOTE / HARNESS, with the reins and ring in amber

#### Scenario: README header
- **WHEN** the repository README is opened on GitHub
- **THEN** its header is the brand banner with the mark, the name and the agent chips
