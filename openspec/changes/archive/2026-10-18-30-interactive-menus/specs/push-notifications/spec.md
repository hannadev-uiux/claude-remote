## MODIFIED Requirements

### Requirement: Deep link and actions
Tapping the notification SHALL open the session; the "Allow"/"Deny" actions MUST answer the request by connecting to the daemon in the background. Requests with an `interaction` (question or plan) MUST NOT offer these actions.

#### Scenario: Deny from the notification
- **WHEN** the user taps "Deny" on the notification
- **THEN** the app sends `permission.respond` with `deny`

#### Scenario: Question without actions
- **WHEN** Claude asks a question and the app is in the background
- **THEN** the push has no Allow/Deny actions and tapping it opens the session

## ADDED Requirements

### Requirement: Interactive request title
The push for a request with an `interaction` SHALL use a generic title saying Claude is waiting for an answer (question) or for a plan review (plan), never the question or plan content.

#### Scenario: Plan ready
- **WHEN** `ExitPlanMode` reaches the daemon with the app in the background
- **THEN** the device receives "Plan ready for review" with the profile name
