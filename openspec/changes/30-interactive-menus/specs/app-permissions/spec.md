## ADDED Requirements

### Requirement: Question card
For a pending request with a question `interaction`, the app SHALL show a card in the session with the title and each question: options as single or multiple choice, a free-text "Other" for choice questions, a text field for `text` and `number` questions, plus Send and Decline. Send MUST be enabled only when every question has an answer, and sends `permission.answer`; Decline sends `permission.respond` `deny`.

#### Scenario: Single choice
- **WHEN** the user taps the option "Postgres" and Send
- **THEN** the app sends `permission.answer` with that label for the question

#### Scenario: Multiple choice with Other
- **WHEN** the user picks "Unit" and "E2E" and types "smoke" in Other
- **THEN** the answer is "Unit, E2E, smoke"

#### Scenario: Answered on the computer
- **WHEN** `permission.resolved` arrives for the question
- **THEN** the card disappears

### Requirement: Plan approval card
For a pending request with a plan `interaction`, the app SHALL show the plan in a scrollable area with the actions "Approve, accept edits", "Approve, review edits" and "Keep planning", the last one with an optional feedback field.

#### Scenario: Approve with manual edits
- **WHEN** the user taps "Approve, review edits"
- **THEN** the app sends a plan answer with `decision: "default"`
