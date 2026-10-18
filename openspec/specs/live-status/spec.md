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
