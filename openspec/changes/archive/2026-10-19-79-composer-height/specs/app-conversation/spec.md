## ADDED Requirements

### Requirement: Composer height
The prompt field SHALL grow with its content from one line (36 pt) up to 140 pt, then scroll. Whenever the field is empty it MUST have the one-line height: after a successful send by any means (Send, long press, ⌘⏎, hardware Return, voice) and after the user deletes all the text. A failed send MUST keep the text and its height.

#### Scenario: Shrinks after sending
- **WHEN** the user sends a five-line message
- **THEN** the empty field returns to the one-line height

#### Scenario: Shrinks when cleared by hand
- **WHEN** the user deletes all the text of a multi-line prompt
- **THEN** the field returns to the one-line height

#### Scenario: Grows up to the maximum
- **WHEN** the user types twenty lines
- **THEN** the field stops growing at 140 pt and scrolls its content

#### Scenario: Failed send
- **WHEN** sending a multi-line message fails
- **THEN** the text and the field's height stay
