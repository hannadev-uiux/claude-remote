## MODIFIED Requirements

### Requirement: Suggestions in the app
When typing `@` or `/` (at the start of the prompt for `/`), the app SHALL show suggestions anchored to the prompt field — above the virtual keyboard when it is visible, or immediately below the field when there is no virtual keyboard on screen (hardware keyboard connected) —, updating with a 150 ms debounce, and insert `@path` or `/name ` on tap or on keyboard confirmation.

#### Scenario: Choose file
- **WHEN** the user types "@app" and taps `src/app.ts`
- **THEN** the text becomes "@src/app.ts "

#### Scenario: Hardware keyboard connected
- **WHEN** the user types "@app" with a hardware keyboard connected and no virtual keyboard on screen
- **THEN** the suggestions appear anchored below the prompt field, not where the virtual keyboard would be

#### Scenario: Master-detail layout
- **WHEN** the user types "/" in the detail pane in regular width
- **THEN** the suggestions stay contained within the detail pane's width, without covering the master pane
