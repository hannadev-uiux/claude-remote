## ADDED Requirements

### Requirement: Selection in the master pane
When shown as the master pane next to the detail pane (regular width), the list SHALL visually highlight the session currently open in the detail pane and SHALL accept arrow-key navigation and opening with Enter.

#### Scenario: Open session highlighted
- **WHEN** a session's conversation is open in the detail pane
- **THEN** the matching item in the list shows a selection highlight

#### Scenario: Keyboard navigation
- **WHEN** the user presses the down arrow with focus on the list
- **THEN** the selection moves to the next session in the grouping, respecting the current order

#### Scenario: Open with Enter
- **WHEN** the user presses Enter with a session selected by keyboard
- **THEN** that session opens in the detail pane
