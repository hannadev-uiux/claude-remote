## ADDED Requirements

### Requirement: Focus the pane
`pane.focus { sessionId }` SHALL select the session's tmux window and pane on the computer (`select-window` then `select-pane`) and reply `ack`; a session without a live pane MUST be rejected with `not_controllable`. The daemon does not raise the terminal application.

#### Scenario: Focus from the tray
- **WHEN** the tray asks to focus a controllable session
- **THEN** tmux switches to that session's window and pane

#### Scenario: Read-only session
- **WHEN** `pane.focus` names a session without a pane
- **THEN** the reply is `error` `not_controllable`
