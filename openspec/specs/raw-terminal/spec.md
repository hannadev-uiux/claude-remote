# raw-terminal Specification

## Purpose
Mirrors the raw content of the session's tmux pane in the app, as a fallback for TUI menus and dialogs.

## Requirements

### Requirement: Pane stream
After `pane.subscribe`, the daemon SHALL send `pane.frame { sessionId, text, cols, rows }` with the visible pane content including color sequences, only when the content changes, at most 4 times per second. `pane.unsubscribe` or disconnection MUST stop the capture.

#### Scenario: Menu open
- **WHEN** the TUI opens the `/model` menu
- **THEN** the app receives a frame with the menu

#### Scenario: Idle pane
- **WHEN** the content does not change
- **THEN** no new frame is sent

### Requirement: Terminal in the app
The Terminal tab SHALL render the frames in a terminal emulator using the app theme, with a key bar (arrows, Enter, Esc, Tab, Shift+Tab, Ctrl+C, 1-9).

#### Scenario: Navigate a menu
- **WHEN** the user taps the down arrow and Enter
- **THEN** the app sends `session.key` `Down` and `Enter` and the next frame shows the selection
