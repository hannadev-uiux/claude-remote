# app-permissions Specification

## Purpose
Allows responding to permission requests and switching a session's permission mode directly in the app.

## Requirements

### Requirement: Permission card
For each pending `permission.request`, the app SHALL show a card in the session with the tool, the input detail (command, path or JSON) and the time remaining, with the Allow, Always allow and Deny actions.

#### Scenario: Bash request
- **WHEN** a `Bash` request arrives with `rm -rf dist`
- **THEN** the card shows the full command and the three actions

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
