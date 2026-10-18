## MODIFIED Requirements

### Requirement: Forget daemon
The settings screen SHALL allow erasing the credentials and returning to pairing through `Forget this machine` in the Machine card, after a confirmation.

#### Scenario: Forget
- **WHEN** the user confirms "Forget this machine"
- **THEN** the credentials are erased, the connection closes and the pairing screen appears
