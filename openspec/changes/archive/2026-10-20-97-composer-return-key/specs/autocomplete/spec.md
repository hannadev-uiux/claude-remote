## ADDED Requirements

### Requirement: Suggestions from the keyboard
While Return sends (a hardware keyboard, or the "Return key sends" setting) and the `@` file or `/` command suggestions are open with at least one row, the first row SHALL be highlighted and kept in view, the highlight SHALL return to the first row whenever the query changes, and Return SHALL accept the highlighted row instead of sending. With a hardware keyboard on iOS and iPadOS, Tab SHALL also accept it, ↑ / ↓ SHALL move the highlight without wrapping, and the caret keys SHALL work normally again once the list closes. Esc SHALL close the list and keep the field focused. With no rows, Return keeps its usual behavior.

#### Scenario: Accept with Return
- **WHEN** a hardware keyboard is in use, the user types `@src` and the list shows three files
- **THEN** the first file is highlighted, and Return inserts it instead of sending the prompt

#### Scenario: Move the highlight
- **WHEN** the command list is open on an iPad with a hardware keyboard and the user presses ↓ twice and then Tab
- **THEN** the third command is inserted

#### Scenario: Last row
- **WHEN** the last row is highlighted and the user presses ↓
- **THEN** the highlight stays on the last row

#### Scenario: Empty list
- **WHEN** the suggestions show no match and the user presses Return with a hardware keyboard
- **THEN** the prompt is sent as typed
