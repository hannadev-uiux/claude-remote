# app-permissions Specification

## Purpose
Allows responding to permission requests and switching a session's permission mode directly in the app.

## Requirements

### Requirement: Permission card
For each pending `permission.request`, the app SHALL show a card in the session with a shield, the tool call in TUI style (`Bash(gh pr create …)`), the time elapsed since the request (red when it is about to expire), the detail label (command, file, url or input), the detail box with the full value, and the Deny, Always and Allow actions in that order. The card MUST NOT name the agent. The same content and order SHALL be used wherever the request is shown (the "Waiting for you" strip, the tray, the lock screen).

#### Scenario: Bash request
- **WHEN** a `Bash` request arrives with `rm -rf dist`
- **THEN** the card shows `Bash(rm -rf dist)`, the elapsed time, the full command and the three actions

#### Scenario: About to expire
- **WHEN** fewer than 30 seconds remain before the request expires
- **THEN** the elapsed time turns red

#### Scenario: Resolved elsewhere
- **WHEN** `permission.resolved` arrives for the request
- **THEN** the card disappears and a subtle notice indicates the outcome

### Requirement: Always-allow confirmation
"Always allow" SHALL open a confirmation with the exact rule (editable) and the scope (profile or project, with the default coming from the daemon) before sending.

#### Scenario: Confirm rule
- **WHEN** the user chooses the "project" scope and confirms `Bash(pnpm test:*)`
- **THEN** the app sends `permission.respond` with `always { rule, scope: "project" }`

### Requirement: Mode selector
The session header SHALL show the confirmed mode and allow choosing `default`, `acceptEdits`, `plan` or `auto`; `bypassPermissions` MUST NOT be offered. Choosing `auto` MUST require explicit confirmation.

#### Scenario: Auto mode
- **WHEN** the user chooses "auto"
- **THEN** an alert asks for confirmation before sending `session.setMode`

#### Scenario: Mode unreachable
- **WHEN** the daemon responds `mode_unreachable`
- **THEN** the app shows the error and the actual mode returned

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
