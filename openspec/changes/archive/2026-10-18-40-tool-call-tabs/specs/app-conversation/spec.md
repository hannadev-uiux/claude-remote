## ADDED Requirements

### Requirement: Tool call details
An expanded tool call SHALL show its details in three tabs: **Output** (the diff for `Edit`, `MultiEdit` and `Write`, then the tool result, or a running indicator while there is none), **Input** (the tool input as labeled fields formatted per tool, with the top-level keys as fallback for unknown tools) and **JSON** (the raw tool name, input and result). A result with no matching tool call MUST show only Output and JSON. The app MUST remember the last tab chosen per tool type, with every MCP tool counted as one type, across app restarts; a tool type never chosen MUST open on Output. Outputs and JSON longer than 4,000 characters MUST be cut with a "Show more" control that reveals the full text. Texts in the tabs MUST be selectable. Tab names and field labels SHALL be translated (pt-BR, en-US, es-ES).

#### Scenario: Bash call
- **WHEN** the user expands a `Bash` call with `command` "pnpm test" that has finished
- **THEN** the Output tab is selected and shows the command output, and the Input tab shows a "Command" field with "pnpm test"

#### Scenario: Read range
- **WHEN** the user opens the Input tab of a `Read` call with `offset` 10 and `limit` 50
- **THEN** it shows the file path and the lines "10–59"

#### Scenario: Remembered tab
- **WHEN** the user picks the JSON tab on a `Grep` call and later expands another `Grep` call, even after restarting the app
- **THEN** the JSON tab opens, while a `Bash` call still opens on Output

#### Scenario: Long output
- **WHEN** a result has more than 4,000 characters
- **THEN** the Output tab shows the first 4,000 and a "Show more" control, and tapping it shows the whole result

#### Scenario: Unknown tool
- **WHEN** the user opens the Input tab of a tool the app does not know
- **THEN** each top-level input key is listed with its value, objects as compact JSON
