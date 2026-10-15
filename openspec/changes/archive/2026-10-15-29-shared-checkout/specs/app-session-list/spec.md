## ADDED Requirements

### Requirement: Shared checkout in the list
Each session row SHALL show the branch of its checkout next to the directory, and a live session that shares its checkout with other live sessions SHALL show a warning badge with how many.

#### Scenario: Two sessions in the same checkout
- **WHEN** two live sessions have the same `checkout.root`
- **THEN** both rows show the badge "shared checkout (1)"

#### Scenario: Ended session
- **WHEN** one of them ends
- **THEN** the badge disappears from the other
