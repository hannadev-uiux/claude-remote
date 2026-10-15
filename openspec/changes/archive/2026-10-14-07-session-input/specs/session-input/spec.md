## Purpose

Allows sending prompts and special keys to a Claude Code session running in tmux, as if they had been typed on the Mac.

## ADDED Requirements

### Requirement: Prompt delivery by paste
The daemon SHALL paste the full text into the session's pane using bracketed paste and then send Enter. Multi-line text, `@` and `/` MUST arrive unchanged.

#### Scenario: Multi-line prompt
- **WHEN** the app sends "line 1\nline 2"
- **THEN** the TUI receives both lines in a single prompt and submits it

#### Scenario: Prompt with a mention
- **WHEN** the app sends "review @src/main.ts"
- **THEN** the text is pasted without opening the autocomplete menu before the Enter

### Requirement: Special keys
The daemon SHALL accept only keys from an allowlist and send them with `send-keys`. Keys outside the list MUST be rejected with `invalid_key`.

#### Scenario: Interrupt
- **WHEN** the app sends `session.key` with `Escape`
- **THEN** the pane receives Esc

#### Scenario: Disallowed key
- **WHEN** the app sends the key `C-z`
- **THEN** the daemon responds with `error` `invalid_key`

### Requirement: Non-controllable session
Input to a session without a live pane MUST be rejected with `not_controllable`.

#### Scenario: Ended session
- **WHEN** the app sends text to an `ended` session
- **THEN** it receives `error` `not_controllable`

### Requirement: Size limit
Prompts above 100 KB MUST be rejected with `too_large`.

#### Scenario: Huge text
- **WHEN** the app sends 200 KB of text
- **THEN** it receives `error` `too_large`
