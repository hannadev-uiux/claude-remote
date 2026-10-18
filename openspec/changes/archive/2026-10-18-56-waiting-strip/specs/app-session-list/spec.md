## ADDED Requirements

### Requirement: Waiting strip
When at least one session is waiting for the user (a pending permission request or a session in the `waiting` state), the list screen SHALL pin a strip above the list with the header "WAITING FOR YOU · N" (N = sessions waiting) and the elapsed time since the oldest item, updated every second; the oldest item with its agent badge, session title, profile tag and `Tool · argument`; and the answer buttons (Deny, Always, Allow) for a tool permission, or a status line ("has a question", "plan ready for review", "waiting for you") with an Open button for questions, plans and sessions without a request. With more than one item it SHALL show "+N more", which opens the session of the next item. The strip MUST NOT change the order of the list, and the waiting row keeps its warning border.

#### Scenario: One Bash permission pending
- **WHEN** one session waits for `Bash · gh pr create --fill`
- **THEN** the strip shows "WAITING FOR YOU · 1", the elapsed time, the session's badge, title and profile, "Bash · gh pr create --fill" and Deny / Always / Allow

#### Scenario: Two sessions waiting
- **WHEN** a second session asks a question while the first permission is still pending
- **THEN** the header reads "WAITING FOR YOU · 2", the oldest request stays answerable and "+1 more" opens the second session

#### Scenario: Nothing waiting
- **WHEN** the last pending request is resolved
- **THEN** the strip disappears and the list keeps its order
