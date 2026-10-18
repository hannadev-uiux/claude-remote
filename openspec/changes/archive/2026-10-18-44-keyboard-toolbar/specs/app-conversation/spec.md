## MODIFIED Requirements

### Requirement: Controls
The screen SHALL offer Esc (interrupt) and Ctrl+C (with confirmation), plus a key bar (arrows, Enter, Tab, 1-3). The key bar SHALL be hidden by default and shown or hidden from the session options menu; the choice MUST be remembered on the device across app restarts.

While the prompt field is focused (on Android, also with the keyboard up), a toolbar SHALL be attached to the top of the keyboard with a "special keys" button and a "hide keyboard" button. The special keys button SHALL expand the same keys as the key bar (Ctrl+C still asks for confirmation) in the toolbar and collapse them again; the expanded state MUST be remembered on the device across app restarts and SHALL be collapsed by default. Sending a key from the toolbar MUST NOT blur the prompt field. When only a hardware keyboard's shortcut bar is up, the toolbar SHALL keep the special keys and omit the hide keyboard button. While the toolbar's keys are expanded, the key bar under the conversation MUST be hidden. All labels MUST be translated.

#### Scenario: Interrupt
- **WHEN** the key bar is shown and the user taps Esc
- **THEN** the app sends `session.key` `Escape`

#### Scenario: Default hidden
- **WHEN** the user opens a session for the first time on a device
- **THEN** the key bar is not shown

#### Scenario: Remembered choice
- **WHEN** the user chooses "Show keyboard shortcuts" and restarts the app
- **THEN** the key bar is shown in every session

#### Scenario: Hide the keyboard
- **WHEN** the prompt field is focused and the user taps "hide keyboard" in the toolbar
- **THEN** the keyboard closes and the toolbar disappears

#### Scenario: Key without leaving the field
- **WHEN** the toolbar's keys are expanded and the user taps ↑
- **THEN** the app sends `session.key` `Up` and the keyboard stays open

#### Scenario: Remembered expansion
- **WHEN** the user expands the toolbar's keys and restarts the app
- **THEN** the keys are expanded the next time the prompt field is focused

#### Scenario: Hardware keyboard
- **WHEN** a hardware keyboard is attached to an iPad and the prompt field is focused
- **THEN** the toolbar shows the special keys without the hide keyboard button

#### Scenario: No duplicate keys
- **WHEN** the key bar is shown and the user focuses the prompt field with the toolbar's keys expanded
- **THEN** the key bar under the conversation is hidden until the keyboard closes

#### Scenario: Read-only session
- **WHEN** the session has no live pane
- **THEN** the prompt field cannot be focused and no toolbar is shown
