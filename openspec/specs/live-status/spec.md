# live-status Specification

## Purpose
TBD - created by archiving change 36-live-status. Update Purpose after archive.

## Requirements

### Requirement: Live status start
The app SHALL start a live status for a session when it sees the session change to `running` while the app is in the foreground, unless "Live status" is turned off in Settings (on by default) or the session or its profile is muted. On iOS it SHALL start a Live Activity (ending any previous one for the same session); on both platforms it SHALL send `live.register` with the session id, platform, FCM token and, on iOS, the activity push token. A daemon that does not know `live.register` MUST NOT cause an error in the app.

#### Scenario: Prompt sent from the phone
- **WHEN** the user sends a prompt from the app and the session becomes `running`
- **THEN** a live status for that session starts and is registered with the daemon

#### Scenario: Muted session
- **WHEN** a muted session becomes `running`
- **THEN** no live status starts

#### Scenario: Setting off
- **WHEN** "Live status" is off in Settings
- **THEN** no live status starts and the existing ones end

### Requirement: Live status content
The live status SHALL show the profile name, the state (working, waiting for you, done, session closed), the current step category, the tool count and the elapsed time since the turn started, and tapping it MUST open the session. Push payloads for the live status MUST NOT contain session content: only the profile name, the state, a step category from a fixed table derived from the tool name, the tool count and timestamps. Texts SHALL be translated (pt-BR, en-US, es-ES).

#### Scenario: Running a command
- **WHEN** Claude Code calls the Bash tool with any command
- **THEN** the live status shows "running a command" and the tool count increases, and the command itself is never sent

### Requirement: Live status updates
The daemon SHALL keep registered live statuses up to date through FCM while the session is registered: `UserPromptSubmit` → working (new start time), a permission request or a waiting notification → waiting for you, the permission resolution → working, transcript tool/thinking/text entries → step and tool count, `Stop` → done, `SessionEnd` → closed. State changes MUST be sent immediately; step and count changes at most every 15 seconds. On `Stop` it MUST end the activity with a dismissal 15 minutes later (Android: a final, non-persistent notification), and on `SessionEnd` it MUST end it right away. On iOS the update uses the activity push token; on Android a notification with a per-session tag on the low-importance "Live status" channel.

#### Scenario: Waiting for permission
- **WHEN** a registered session asks for a permission
- **THEN** the live status immediately shows "waiting for you"

#### Scenario: Turn finished
- **WHEN** a registered session fires `Stop`
- **THEN** the live status shows "done" and is dismissed after 15 minutes

### Requirement: Live status and mute
The daemon MUST NOT send live status updates for a muted session or profile; when a registered session becomes muted, the daemon SHALL end its live status and drop the registration.

#### Scenario: Muting a working session
- **WHEN** the user mutes a session with a live status
- **THEN** the live status ends at the next update and no further updates are sent

### Requirement: Live status protocol
The protocol SHALL have `live.register { sessionId, platform, fcmToken, activityToken? }` (replies `ack`, replacing an earlier registration of the same session) and `live.unregister { sessionId }` (replies `ack`). Registrations MAY be kept in memory only.

#### Scenario: New activity for the same session
- **WHEN** the app registers a second live status for a session
- **THEN** the daemon keeps only the latest registration
