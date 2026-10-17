## MODIFIED Requirements

### Requirement: Controls
The screen SHALL offer Esc (interrupt) and Ctrl+C (with confirmation), plus a key bar (arrows, Enter, Tab, 1-3). The key bar SHALL be hidden by default and shown or hidden from the session options menu; the choice MUST be remembered on the device across app restarts.

#### Scenario: Interrupt
- **WHEN** the key bar is shown and the user taps Esc
- **THEN** the app sends `session.key` `Escape`

#### Scenario: Default hidden
- **WHEN** the user opens a session for the first time on a device
- **THEN** the key bar is not shown

#### Scenario: Remembered choice
- **WHEN** the user chooses "Show keyboard shortcuts" and restarts the app
- **THEN** the key bar is shown in every session

## ADDED Requirements

### Requirement: Session options menu
The session header SHALL have a single "More options" button that opens a menu with "View terminal", "Show keyboard shortcuts" / "Hide keyboard shortcuts" and "Conversation history". The menu MUST be native on iOS and look like the platform overflow menu on Android. In a read-only session, "View terminal" and the shortcuts toggle MUST be disabled and the menu MUST say why; "Conversation history" stays enabled. All labels MUST be translated.

#### Scenario: Open the terminal
- **WHEN** the user picks "View terminal" in a controllable session
- **THEN** the raw terminal screen of the session opens

#### Scenario: Read-only session
- **WHEN** the user opens the menu in a session without a tmux pane
- **THEN** "View terminal" and the shortcuts toggle are disabled and the menu explains that the session is read-only

### Requirement: Prompt history
"Conversation history" SHALL list the session's prompts from the loaded transcript, newest first, and offer to load earlier pages until the start of the transcript. Tapping a prompt MUST close the list and scroll the conversation to that prompt.

#### Scenario: Jump to an earlier prompt
- **WHEN** the user opens the history and taps a prompt sent earlier
- **THEN** the list closes and the conversation scrolls to that prompt

#### Scenario: Load earlier
- **WHEN** the transcript has older pages and the user taps "Load earlier"
- **THEN** older prompts are added to the end of the list
