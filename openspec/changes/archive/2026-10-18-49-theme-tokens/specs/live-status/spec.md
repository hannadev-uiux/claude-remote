## MODIFIED Requirements

### Requirement: Live status protocol
The protocol SHALL have `live.register { sessionId, platform, fcmToken, activityToken?, relay?, palette? }` (replies `ack`, replacing an earlier registration of the same session) and `live.unregister { sessionId }` (replies `ack`). `palette` carries the app theme colors used by the live status (`background`, `text`, `textMuted`, `accent`, `success`, `warning`); the daemon SHALL keep it with the registration and include it as `palette` in the props of every update it sends for that registration. Registrations MAY be kept in memory only.

#### Scenario: New activity for the same session
- **WHEN** the app registers a second live status for a session
- **THEN** the daemon keeps only the latest registration

#### Scenario: Palette echoed
- **WHEN** the app registers with a palette and the daemon later sends a "waiting" update
- **THEN** the update's props carry the same palette

#### Scenario: Older app without a palette
- **WHEN** the registration has no palette
- **THEN** the props are sent without one and the widget renders with its dark defaults

### Requirement: Live status content
The live status SHALL show, on the iOS lock screen: the app icon; the daemon name (the computer's host name, falling back to the profile name) with the elapsed time of the turn; the session name; the session folder (with the home directory shortened to `~`); and the latest steps of the turn (at most 3, newest first, consecutive repeats collapsed into one line with a count). The state MUST be signaled by a colored border around the banner (working, waiting for you, done, session closed) and by a footer with the state name and a live counter of the time since the state last changed. The colors of the banner (background, texts and the state colors: working = accent, waiting = warning, done = success, closed = muted text) SHALL come from the `palette` in the props, falling back to the dark theme values when the props carry none. When the turn is done or the session closed, the elapsed time MUST stop at the turn's duration. Tapping it MUST open the session. Push payloads for the live status MAY contain the session title and its working directory, and MUST NOT contain any other session content: only the profile and host names, the state, step categories from a fixed table derived from the tool name (with the tool name), the tool count, timestamps and the palette. Texts SHALL be translated (pt-BR, en-US, es-ES).

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
- **THEN** it renders with the profile name as header and no session, folder or steps, in the dark colors

#### Scenario: Theme palette
- **WHEN** the app starts a live status while rendering the dark theme
- **THEN** the banner background is `#0D0D0D` and the working border is the amber accent
