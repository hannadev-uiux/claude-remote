## MODIFIED Requirements

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
