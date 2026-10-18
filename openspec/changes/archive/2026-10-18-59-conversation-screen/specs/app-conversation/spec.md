## ADDED Requirements

### Requirement: Context line
Under the header, the session screen SHALL show a first context line with the agent badge, the profile tag (name in the profile color), the folder (truncating; opens the session details), the state pill and the permission mode chip. The header itself SHALL show, after the title, the notifications bell, a terminal button (disabled in read-only sessions) and the More options button.

#### Scenario: Live session
- **WHEN** a controllable Claude Code session in `~/projects/acme-api` is open
- **THEN** the context line shows the Claude Code badge, the profile tag, `~/projects/acme-api`, the state pill and the mode chip, and the header's terminal button opens the raw terminal

#### Scenario: Read-only session
- **WHEN** the session has no tmux pane
- **THEN** the terminal button is disabled and the mode chip is dimmed

## MODIFIED Requirements

### Requirement: Entry rendering
The screen SHALL show user messages, assistant text in markdown, collapsed thinking, collapsible tool calls with a one-line summary, and results; tool errors MUST appear in red. The assistant's leading dot SHALL take the session agent's color (Claude Code's until the protocol carries the agent); user messages keep the accent `>`.

#### Scenario: Tool call
- **WHEN** a `tool_use` entry for `Bash` arrives with `command` "pnpm test"
- **THEN** a collapsed "Bash(pnpm test)" line appears that expands to show the result

#### Scenario: Unknown entry
- **WHEN** an `unknown` entry arrives
- **THEN** a subtle block appears with the raw JSON collapsed

#### Scenario: Agent color
- **WHEN** an assistant message of a Claude Code session is shown
- **THEN** its leading dot is in the Claude Code color while the user prompt marker stays in the accent

### Requirement: Prompt sending
The prompt field SHALL send `session.input` and clear the field after the `ack`; on error, it MUST keep the text and show the message. In a read-only session the field MUST be disabled and its placeholder say so. Otherwise the placeholder SHALL name the agent when it is known (`message Claude Code… (@ files, / commands)`) and say `message the agent…` when it is not.

#### Scenario: Successful send
- **WHEN** the user sends "continue"
- **THEN** the field is cleared and the prompt appears in the conversation once written to the transcript

#### Scenario: Placeholder
- **WHEN** a Claude Code session is open and the field is empty
- **THEN** it reads "message Claude Code… (@ files, / commands)"

### Requirement: Session options menu
The session header SHALL have a "More options" button that opens a menu with "View terminal", "Subagents (N)" / "Subagents (N · M running)" when the session has subagents, "Show keyboard shortcuts" / "Hide keyboard shortcuts", "Conversation history", "Stop following output" / "Follow output" and "Close session". The menu MUST be native on iOS and look like the platform overflow menu on Android. In a read-only session, "View terminal", the shortcuts toggle and "Close session" MUST be disabled and the menu MUST say why; "Conversation history", the follow toggle and "Subagents" stay enabled. The button SHALL show an accent dot while any subagent runs. All labels MUST be translated.

#### Scenario: Open the terminal
- **WHEN** the user picks "View terminal" in a controllable session
- **THEN** the raw terminal screen of the session opens

#### Scenario: Read-only session
- **WHEN** the user opens the menu in a session without a tmux pane
- **THEN** "View terminal", the shortcuts toggle and "Close session" are disabled, the follow toggle is enabled, and the menu explains that the session is read-only

#### Scenario: Toggle following
- **WHEN** following is on and the user picks "Stop following output"
- **THEN** following turns off and the menu then offers "Follow output"

### Requirement: Status bar
The session screen SHALL show a second context line under the first with, when known: the model as an outlined chip (with the effort level after a dot, `sonnet-5.5 · high`), the provider as a dashed chip (`via OpenRouter`, once the protocol carries it), the git branch (`⎇`), and then the context window usage and the profile's 5-hour and weekly usage limits. Items without data MUST be hidden (never shown as `0%`), a limit whose reset time has passed MUST be hidden, and the whole line MUST be hidden when nothing is known. Percentages SHALL use secondary text below 70%, Claude orange from 70% and red from 90%. Tapping the line SHALL open a sheet with the details (tokens used and window size, reset times in the device's locale). All texts MUST be translated.

#### Scenario: Full data
- **WHEN** the session reports Opus 5.5, effort high, context 62%, the folder is on branch `feat/rate-limit` and the profile reports 41% (5 h) and 73% (week)
- **THEN** the line shows the chip `Opus 5.5 · high`, `⎇ feat/rate-limit`, the context percentage and both limits

#### Scenario: No data
- **WHEN** the session has no status and its folder is not in git
- **THEN** no second context line is shown

#### Scenario: Near the limit
- **WHEN** the weekly limit reaches 92%
- **THEN** its percentage is shown in red

#### Scenario: Details
- **WHEN** the user taps the line
- **THEN** a sheet shows `124k / 200k` tokens and when each limit resets
