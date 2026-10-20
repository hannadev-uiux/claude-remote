## ADDED Requirements

### Requirement: Question reminder push
The reminder for an interactive request SHALL be a push titled "Still waiting for your answer" (question) or "Plan still waiting for review" (plan), with the profile name as the body and the session deep link. It has no content from the session and no Allow/Deny actions, and it follows the same mute and foreground rules as other pushes.

#### Scenario: Reminder on the lock screen
- **WHEN** a question reminder is sent with the app in the background
- **THEN** the phone shows "Still waiting for your answer" with the profile name, and tapping it opens the session
