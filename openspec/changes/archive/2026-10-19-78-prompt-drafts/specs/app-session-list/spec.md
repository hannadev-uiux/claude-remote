## ADDED Requirements

### Requirement: Draft marker
A session row SHALL show a `Draft:` line with the start of the session's draft (whitespace collapsed, cut at 60 characters with an ellipsis), or the number of photos when the draft has no text. The line MUST be translated and readable by screen readers, and MUST disappear when the draft is sent or discarded.

#### Scenario: Row with a draft
- **WHEN** a session has the draft "fix the failing test in parser.ts"
- **THEN** its row shows "Draft: fix the failing test in parser.ts"

#### Scenario: Draft sent
- **WHEN** the draft is sent
- **THEN** the row no longer shows the line
