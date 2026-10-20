## ADDED Requirements

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
