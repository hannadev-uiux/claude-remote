## ADDED Requirements

### Requirement: Interactive tool requests
When the `PermissionRequest` tool is `AskUserQuestion` or `ExitPlanMode` and its input is well formed, the daemon SHALL include `interaction` in `permission.request`: for questions, the optional title and each question with its text, header, kind (`choice`, `text` or `number`), options (label and description) and `multiSelect`; for a plan, the plan text. Malformed input MUST produce no `interaction`.

#### Scenario: Multiple-choice question
- **WHEN** `AskUserQuestion` arrives with one question and three options
- **THEN** `permission.request` carries `interaction.kind: "question"` with the question and the three options

#### Scenario: Malformed input
- **WHEN** `AskUserQuestion` arrives without `questions`
- **THEN** `permission.request` has no `interaction`

### Requirement: Structured answers
The daemon SHALL accept `permission.answer` for a pending interactive request and answer the hook: a question answer becomes `allow` with `updatedInput` equal to the original input plus `answers` (question text → answer); a plan approval becomes `allow` with `updatedPermissions` `setMode` (`acceptEdits` or `default`, destination `session`); "keep planning" becomes `deny` with the user's feedback or a localized default message. An answer whose kind does not match the request, or `permission.respond` `allow` on an interactive request, MUST be rejected with `bad_request`.

#### Scenario: Question answered on the phone
- **WHEN** the app sends `permission.answer` with `{"Which database?": "Postgres"}`
- **THEN** the hook receives `behavior: "allow"` and `updatedInput.answers` with that answer, and clients receive `permission.resolved` `allowed`

#### Scenario: Keep planning
- **WHEN** the app sends a plan answer `keepPlanning` with the feedback "split step 2"
- **THEN** the hook receives `behavior: "deny"` with the message "split step 2"

#### Scenario: Answered in the terminal
- **WHEN** the user answers the question on the computer while the phone shows it
- **THEN** Claude Code closes the hook request and clients receive `permission.resolved` `cancelled`
