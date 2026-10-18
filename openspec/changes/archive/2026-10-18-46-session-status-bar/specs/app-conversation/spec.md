## ADDED Requirements

### Requirement: Status bar
The session screen SHALL show a single-line status bar under the session info with, when known: the model, the effort level, the context window usage and the profile's 5-hour and weekly usage limits. Items without data MUST be hidden (never shown as `0%`), and a limit whose reset time has passed MUST be hidden. Percentages SHALL use secondary text below 70%, Claude orange from 70% and red from 90%. Tapping the bar SHALL open a sheet with the details (tokens used and window size, reset times in the device's locale). All texts MUST be translated.

#### Scenario: Full data
- **WHEN** the session reports Opus 5.5, effort high, context 62% and the profile reports 41% (5 h) and 73% (week)
- **THEN** the bar shows the model, `high`, the context percentage and both limits

#### Scenario: No data
- **WHEN** the session has no status
- **THEN** no status bar is shown

#### Scenario: Near the limit
- **WHEN** the weekly limit reaches 92%
- **THEN** its percentage is shown in red

#### Scenario: Details
- **WHEN** the user taps the status bar
- **THEN** a sheet shows `124k / 200k` tokens and when each limit resets
