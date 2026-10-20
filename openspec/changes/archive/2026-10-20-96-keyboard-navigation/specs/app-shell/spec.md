## MODIFIED Requirements

### Requirement: Hardware keyboard shortcuts
With a hardware keyboard, on every layout (phones and tablets, iOS and Android; on Android Ctrl stands for ⌘ and only shortcuts on letters, digits, arrows, Enter and Esc reach the app), besides ⌘N (new session), ⌘, (settings) and ⌘⏎ (send now), the app SHALL offer: ⌘1 to ⌘9 to open the nth session of the list in its current order; ⌘K or ⌘F to focus the session search (returning to the list on phones); ⌘T to open the open session's terminal (the inspector's Terminal tab on tablets, the terminal screen on phones); ⌘. to send Esc to the open session; ⌘⇧M to cycle its permission mode through default, accept edits and plan (never auto, which needs its confirmation); ⌘A / ⌘D to allow or deny the oldest pending tool permission of the open session; ⌘↑ / ⌘↓ (and ⌥⌘↑ / ⌥⌘↓) to open the previous / next session of the list from inside a session, without wrapping and keeping the list as the screen "back" returns to; ⌘⇧O to open the open session's More options menu; ⌘L to focus its message input; and ⌘/ to open a translated **Keyboard shortcuts** sheet listing all of them, closed by Esc or ⌘/ again. ⌘A, ⌘D, ⌘↑ and ⌘↓ MUST do nothing while a text field is focused.

Esc SHALL go back: from a session to the list, from any other pushed screen one step back, and close the open sheet or menu first when there is one. While a text field is focused, Esc SHALL first close the composer's suggestions when they are open, else blur the field; the next Esc goes back. On the raw terminal screen Esc MUST NOT be taken (it belongs to the terminal); ⌘[ SHALL go back from any screen, the terminal included, even with a focused field.

While the session list is the visible screen (the phone's list, or the tablet's sidebar), ↑ / ↓ SHALL move a visible focus ring between sessions, scrolling to keep it in view, and Enter SHALL open the selected session; these keys MUST do nothing while a text field is focused. In the More options menu drawn by the app (Android), ↑ / ↓ SHALL move between the enabled items, Enter SHALL choose and Esc SHALL close; the iOS system sheet keeps its own keyboard handling.

#### Scenario: Open the third session
- **WHEN** the user presses ⌘3 with five sessions listed
- **THEN** the third session of the list opens

#### Scenario: Answer from the keyboard
- **WHEN** a tool permission is pending in the open session, no field is focused and the user presses ⌘A
- **THEN** the app sends `permission.respond` `allow` for that request

#### Scenario: Select all keeps working
- **WHEN** the composer is focused and the user presses ⌘A
- **THEN** the text is selected and no permission is answered

#### Scenario: Cycle the mode
- **WHEN** the open session is in `acceptEdits` and the user presses ⌘⇧M
- **THEN** the app sends `session.setMode` `plan`

#### Scenario: Back to the list on a phone
- **WHEN** a session is open on a phone, no field is focused and the user presses Esc
- **THEN** the session list is shown

#### Scenario: Esc in the composer
- **WHEN** the composer is focused without suggestions and the user presses Esc twice
- **THEN** the first Esc blurs the composer and the second returns to the list

#### Scenario: Esc closes suggestions first
- **WHEN** the composer shows the `@` file suggestions and the user presses Esc
- **THEN** the suggestions close and the composer keeps its focus

#### Scenario: Terminal keeps Esc
- **WHEN** the raw terminal screen is open and the user presses Esc
- **THEN** the app stays on the terminal; ⌘[ returns to the session

#### Scenario: Arrows on a phone
- **WHEN** the phone shows the list with three sessions, no field is focused and the user presses ↓, ↓, Enter
- **THEN** the focus ring moves to the second session and Enter opens it

#### Scenario: Next session
- **WHEN** the second of three listed sessions is open, no field is focused and the user presses ⌘↓
- **THEN** the third session opens in its place and Esc returns to the list

#### Scenario: Last session
- **WHEN** the last listed session is open and the user presses ⌘↓
- **THEN** nothing changes

#### Scenario: More options from the keyboard
- **WHEN** a session is open and the user presses ⌘⇧O
- **THEN** its More options menu opens

#### Scenario: Focus the input
- **WHEN** a session is open and the user presses ⌘L
- **THEN** the message input is focused

#### Scenario: Shortcuts sheet
- **WHEN** the user presses ⌘/
- **THEN** the Keyboard shortcuts sheet lists the shortcuts with translated labels, and Esc closes it
