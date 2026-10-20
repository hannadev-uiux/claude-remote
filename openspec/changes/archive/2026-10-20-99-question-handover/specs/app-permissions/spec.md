## ADDED Requirements

### Requirement: Request handed over to the terminal
A request with `terminal: true` SHALL keep its card with the same title and summary (the question texts, the plan, or the tool call). The card MUST be labelled "Answer in the terminal", MUST NOT offer answer actions, and SHALL offer a button that opens the session's terminal when the session is controllable, or say to answer on the computer otherwise. The "Waiting for you" strip SHALL show the same status without Allow/Deny. Receiving the handed-over request again MUST NOT repeat the new-request haptic.

#### Scenario: Question handed over
- **WHEN** a pending question arrives again with `terminal: true`
- **THEN** the card keeps the question text, shows "Answer in the terminal" and an "Open terminal" button

#### Scenario: Read-only session
- **WHEN** the handed-over request belongs to a read-only session
- **THEN** the card says to answer on the computer and has no terminal button

#### Scenario: Session moves on
- **WHEN** `permission.resolved` arrives for the handed-over request
- **THEN** the card disappears
