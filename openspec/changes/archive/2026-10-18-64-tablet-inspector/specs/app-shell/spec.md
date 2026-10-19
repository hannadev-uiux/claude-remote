## ADDED Requirements

### Requirement: Tablet layout
The app SHALL lay itself out by window width (points on iOS, dp on Android): below 700 the phone layout (one pane; Split View one third and Slide Over included); from 700 to 1099 two columns, the session list (340 wide) beside the conversation, with the inspector opening as a side sheet from a header button; from 1100 three columns, the list, the conversation (content at most 760 wide, the permission card and the queue sharing that width) and the inspector (320 wide by default). In the two-column class in portrait, the list SHALL instead slide over the dimmed conversation from a ☰ header button, opening on its own while no session is open and closing when one is picked. The inspector SHALL have the tabs **Terminal** (the live mirror of the pane), **Subagents** (with the count in the tab, the same rows as the subagents sheet) and **Details** (the same rows as the session details sheet), SHALL be resizable between 280 and 420 by dragging its edge, and SHALL remember its tab and width while the app runs. All texts MUST be translated.

#### Scenario: Landscape iPad
- **WHEN** the window is 1180 wide and a session is open
- **THEN** the list, the conversation and the inspector are shown side by side, the inspector on its last tab

#### Scenario: Portrait iPad
- **WHEN** the window is 820 wide and taller than wide
- **THEN** the conversation fills the window, ☰ slides the list over it, and the inspector opens as a side sheet from its header button

#### Scenario: Slide Over
- **WHEN** the window is 320 wide
- **THEN** the phone layout is used and no inspector button is shown

#### Scenario: Resize the inspector
- **WHEN** the user drags the inspector's edge 200 points to the left from its default width
- **THEN** the inspector is 420 wide, its maximum

### Requirement: Hardware keyboard shortcuts
With a hardware keyboard, besides ⌘N (new session), ⌘, (settings) and ⌘⏎ (send now), the app SHALL offer: ⌘1 to ⌘9 to open the nth session of the list in its current order; ⌘K to focus the session search (returning to the list on phones); ⌘T to open the open session's terminal (the inspector's Terminal tab on tablets, the terminal screen on phones); ⌘. to send Esc to the open session; ⌘⇧M to cycle its permission mode through default, accept edits and plan (never auto, which needs its confirmation); and ⌘A / ⌘D to allow or deny the oldest pending tool permission of the open session. ⌘A and ⌘D MUST do nothing while a text field is focused.

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
