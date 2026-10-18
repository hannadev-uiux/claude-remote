## MODIFIED Requirements

### Requirement: Live status content
The live status SHALL show, on the iOS lock screen: the app icon; the daemon name (the computer's host name, falling back to the profile name) with the elapsed time of the turn; the session name; the session folder (with the home directory shortened to `~`); and the latest steps of the turn (at most 3, newest first, consecutive repeats collapsed into one line with a count). The state MUST be signaled by a colored border around the banner (working, waiting for you, done, session closed) and by a footer with the state name and a live counter of the time since the state last changed. When the turn is done or the session closed, the elapsed time MUST stop at the turn's duration. Tapping it MUST open the session. Push payloads for the live status MAY contain the session title and its working directory, and MUST NOT contain any other session content: only the profile and host names, the state, step categories from a fixed table derived from the tool name (with the tool name), the tool count and timestamps. Texts SHALL be translated (pt-BR, en-US, es-ES).

#### Scenario: Running a command
- **WHEN** Claude Code calls the Bash tool with any command
- **THEN** the live status lists "Bash · running a command" among the latest steps and the tool count increases, and the command itself is never sent

#### Scenario: Waiting for a while
- **WHEN** a session has been waiting for permission for 10 minutes
- **THEN** the border has the waiting color and the footer shows the waiting state with a 10 minute counter

#### Scenario: Turn finished
- **WHEN** a turn that started 4 minutes ago finishes
- **THEN** the elapsed time shows 4 minutes and stops counting, and the border turns to the done color

#### Scenario: Older payload
- **WHEN** the widget receives props without the new fields (older daemon)
- **THEN** it renders with the profile name as header and no session, folder or steps
