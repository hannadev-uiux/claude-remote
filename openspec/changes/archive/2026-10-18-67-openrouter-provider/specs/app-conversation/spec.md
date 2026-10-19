## MODIFIED Requirements

### Requirement: Status bar
The session screen SHALL show a second context line under the first with, when known: the model as an outlined chip (with the effort level after a dot, `sonnet-5.5 · high`), the provider as a dashed chip (`via OpenRouter`, from the session's profile), the git branch (`⎇`), and then the context window usage and the profile's 5-hour and weekly usage limits. Items without data MUST be hidden (never shown as `0%`), a limit whose reset time has passed MUST be hidden, and the whole line MUST be hidden when nothing is known. Percentages SHALL use secondary text below 70%, Claude orange from 70% and red from 90%. Tapping the line SHALL open a sheet with the details (tokens used and window size, reset times in the device's locale). All texts MUST be translated.

#### Scenario: Full data
- **WHEN** the session reports Opus 5.5, effort high, context 62%, the folder is on branch `feat/rate-limit` and the profile reports 41% (5 h) and 73% (week)
- **THEN** the line shows the chip `Opus 5.5 · high`, `⎇ feat/rate-limit`, the context percentage and both limits

#### Scenario: OpenRouter session
- **WHEN** the session belongs to a profile whose provider is OpenRouter
- **THEN** the line shows the dashed chip `via OpenRouter` after the model chip

#### Scenario: No data
- **WHEN** the session has no status and its folder is not in git
- **THEN** no second context line is shown

#### Scenario: Near the limit
- **WHEN** the weekly limit reaches 92%
- **THEN** its percentage is shown in red

#### Scenario: Details
- **WHEN** the user taps the line
- **THEN** a sheet shows `124k / 200k` tokens and when each limit resets

### Requirement: Session options menu
The session header SHALL have a "More options" button that opens a menu with "View terminal", "Change model…" when the session's profile has a provider, "Subagents (N)" / "Subagents (N · M running)" when the session has subagents, "Show keyboard shortcuts" / "Hide keyboard shortcuts", "Conversation history", "Stop following output" / "Follow output" and "Close session". "Change model…" SHALL open the model picker and send `/model <id>` to the session as a prompt delivered now. The menu MUST be native on iOS and look like the platform overflow menu on Android. In a read-only session, "View terminal", "Change model…", the shortcuts toggle and "Close session" MUST be disabled and the menu MUST say why; "Conversation history", the follow toggle and "Subagents" stay enabled. The button SHALL show an accent dot while any subagent runs. All labels MUST be translated.

#### Scenario: Open the terminal
- **WHEN** the user picks "View terminal" in a controllable session
- **THEN** the raw terminal screen of the session opens

#### Scenario: Change the model
- **WHEN** the user picks "Change model…" in a controllable OpenRouter session and chooses `anthropic/claude-opus-5.5`
- **THEN** the session receives `/model anthropic/claude-opus-5.5`

#### Scenario: Read-only session
- **WHEN** the user opens the menu in a session without a tmux pane
- **THEN** "View terminal", the shortcuts toggle and "Close session" are disabled, the follow toggle is enabled, and the menu explains that the session is read-only

#### Scenario: Toggle following
- **WHEN** following is on and the user picks "Stop following output"
- **THEN** following turns off and the menu then offers "Follow output"
