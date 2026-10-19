## ADDED Requirements

### Requirement: Answers from the list
The oldest pending tool permission SHALL be answerable from the "Waiting for you" strip on the session list with the same flow as the session screen: Allow and Deny send `permission.respond`; Always opens the always-allow confirmation with the session's folder and profile before sending the rule. A request resolved elsewhere MUST leave the strip and the next pending item takes its place. Question and plan prompts MUST NOT be answered inline from the strip; they offer Open to the session.

#### Scenario: Allow from the list
- **WHEN** the user taps Allow on the strip
- **THEN** the app sends `permission.respond` `allow` for that request and the strip moves to the next item or disappears

#### Scenario: Always from the list
- **WHEN** the user taps Always on the strip and confirms the rule with the "project" scope
- **THEN** the app sends `permission.respond` with `always { rule, scope: "project" }`

#### Scenario: Question pending
- **WHEN** the oldest item is a question
- **THEN** the strip shows "has a question" and Open, and no Deny / Always / Allow buttons
