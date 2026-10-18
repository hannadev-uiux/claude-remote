## MODIFIED Requirements

### Requirement: Scrolling and history
The screen SHALL follow the end of the conversation while following is on, the user is at the end and is not scrolling the list (dragging or flinging); otherwise new content MUST NOT move the visible position. Following SHALL be on by default and switched from the session options menu; the choice MUST be remembered on the device across app restarts and apply to every conversation, subagents included. When a new entry arrives at the end and the list does not follow it, a "new messages" button SHALL appear; tapping it scrolls to the end. Loading earlier pages when scrolling to the top MUST NOT move the visible position and MUST NOT show the "new messages" button. Opening a conversation SHALL show its end, whatever the toggle says. When the list's height changes (keyboard, rotation) while the user is at the end, the end SHALL stay in view.

#### Scenario: Reading history
- **WHEN** the user has scrolled up and a new entry arrives
- **THEN** the position does not change and the "new messages" button appears

#### Scenario: Growing read-only session
- **WHEN** a read-only session keeps receiving entries and the user scrolls up to read
- **THEN** the list is not pulled back to the end, and tapping "new messages" brings it back

#### Scenario: Following off
- **WHEN** following is off, the user is at the end and a new entry arrives
- **THEN** the position does not change and the "new messages" button appears

#### Scenario: Remembered choice
- **WHEN** the user chooses "Stop following output" and restarts the app
- **THEN** following is still off in every session

#### Scenario: Earlier pages
- **WHEN** the user scrolls to the top and an earlier page loads
- **THEN** the messages that were visible stay in place and no "new messages" button appears

#### Scenario: Flick up while streaming
- **WHEN** following is on, entries keep arriving and the user flicks the list up from the end
- **THEN** the fling is not interrupted and the list stays where it stops

#### Scenario: Open with following off
- **WHEN** following is off and the user opens a conversation
- **THEN** the conversation opens at its end

#### Scenario: Keyboard opens at the end
- **WHEN** the user is at the end and focuses the prompt field
- **THEN** the last message stays visible above the keyboard

### Requirement: Session options menu
The session header SHALL have a single "More options" button that opens a menu with "View terminal", "Show keyboard shortcuts" / "Hide keyboard shortcuts", "Conversation history" and "Stop following output" / "Follow output". The menu MUST be native on iOS and look like the platform overflow menu on Android. In a read-only session, "View terminal" and the shortcuts toggle MUST be disabled and the menu MUST say why; "Conversation history" and the follow toggle stay enabled. All labels MUST be translated.

#### Scenario: Open the terminal
- **WHEN** the user picks "View terminal" in a controllable session
- **THEN** the raw terminal screen of the session opens

#### Scenario: Read-only session
- **WHEN** the user opens the menu in a session without a tmux pane
- **THEN** "View terminal" and the shortcuts toggle are disabled, the follow toggle is enabled, and the menu explains that the session is read-only

#### Scenario: Toggle following
- **WHEN** following is on and the user picks "Stop following output"
- **THEN** following turns off and the menu then offers "Follow output"
