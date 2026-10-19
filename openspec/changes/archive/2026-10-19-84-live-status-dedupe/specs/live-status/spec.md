## MODIFIED Requirements

### Requirement: Live status start
The app SHALL start a live status for a session when it sees the session change to `running` while the app is in the foreground, unless "Live status" is turned off in Settings (on by default) or the session or its profile is muted. On iOS it SHALL reuse the session's existing Live Activity when there is one (updating it back to working with a new start time) and otherwise start one; on both platforms it SHALL send `live.register` with the session id, platform, FCM token and, on iOS, the activity push token. A daemon that does not know `live.register` MUST NOT cause an error in the app.

#### Scenario: Prompt sent from the phone
- **WHEN** the user sends a prompt from the app and the session becomes `running`
- **THEN** a live status for that session starts and is registered with the daemon

#### Scenario: Muted session
- **WHEN** a muted session becomes `running`
- **THEN** no live status starts

#### Scenario: Setting off
- **WHEN** "Live status" is off in Settings
- **THEN** no live status starts and the existing ones end

#### Scenario: New turn while done
- **WHEN** a session whose live status shows "done" (within its 15 minutes) starts a new turn
- **THEN** the same activity turns back to working with a new timer and no second activity appears

### Requirement: Live status content
The live status SHALL show, on the iOS lock screen: the app mark as the only icon; `<profile> · <machine>` (the computer's host name, falling back to the profile name); the session name; the session folder (home shortened to `~`); a large tabular timer of the turn in the state color; a state line with the state name, the current step category, the tool count and, when the session runs tasks in parallel (background tasks plus running subagents), their translated count ("2 tasks running"); a row with the glyphs of the last five step categories (`⌘` command, `✎` edit, `⌕` search, `⇄` web, `⌥` subagent, `?` permission, `·` other), the current one in the state color; and an indeterminate bar while working. Color MUST encode only the state (working = accent, waiting = warning, done = success, closed = muted text), on the border, the timer, the state line and the current glyph, with the colors coming from the `palette` in the props and falling back to the dark theme values. While a tool permission waits, the banner SHALL show Deny and Allow buttons that answer it (see Live status updates). When the turn is done, the timer MUST freeze at the turn's duration with the "total" hint; when the session closed, the banner stays muted with the hint that the transcript is kept. In the Dynamic Island the compact view SHALL show the mark and the timer (or the current glyph), the minimal view the mark and a state dot, and the expanded view the lock screen content. Tapping it MUST open the session. Push payloads for the live status MAY contain the session title and its working directory, and MUST NOT contain any other session content: only the profile and host names, the state, step categories from a fixed table derived from the tool name (with the tool name), glyphs, the tool and task counts, the pending request id and tool name with the button labels, timestamps and the palette. Texts SHALL be translated (pt-BR, en-US, es-ES). On Android the notification body SHALL carry the state, the step, the tool count, the task count and the glyph row.

#### Scenario: Running a command
- **WHEN** Claude Code calls the Bash tool with any command
- **THEN** the live status lists "Bash · running a command" among the latest steps, the glyph row gains `⌘` and the tool count increases, and the command itself is never sent

#### Scenario: Waiting for a while
- **WHEN** a session has been waiting for permission for 10 minutes
- **THEN** the border, timer and state line have the waiting color, the state line shows the waiting state, and the Deny / Allow buttons are visible

#### Scenario: Turn finished
- **WHEN** a turn that started 4 minutes ago finishes
- **THEN** the timer shows 4 minutes with the "total" hint and stops counting, and the colors turn to the done color

#### Scenario: Older payload
- **WHEN** the widget receives props without the new fields (older daemon)
- **THEN** it renders with the profile name as header and no session, folder, steps, glyphs or buttons, in the dark colors

#### Scenario: Theme palette
- **WHEN** the app starts a live status while rendering the dark theme
- **THEN** the banner background is `#0D0D0D` and the working color is the amber accent

#### Scenario: Tasks in parallel
- **WHEN** a working session has one background task and one running subagent
- **THEN** its single live status shows "2 tasks running" in the state line, and nothing else about those tasks

### Requirement: Live status updates
The daemon SHALL keep registered live statuses up to date through FCM while the session is registered: `UserPromptSubmit` → working (new start time), a permission request or a waiting notification → waiting for you (a tool permission also sets `pending` with its request id and tool), the permission resolution → working (pending cleared), transcript tool/thinking/text entries → step, glyph and tool count, changes of the session's background tasks or running subagents → task count, `Stop` → done, `SessionEnd` → closed. State and pending changes MUST be sent immediately; step, tool and task count changes at most every 15 seconds. On `Stop` it MUST update the activity to done (Android: a notification that is not persistent), keep the registration and end the activity 15 minutes later unless a new `UserPromptSubmit` comes first, which MUST turn the same activity back to working. On `SessionEnd` it MUST end it right away. On iOS the update uses the activity push token; on Android a notification with a per-session tag on the low-importance "Live status" channel. The Deny / Allow buttons of the activity SHALL reach the app as interactions whose target names the decision and the request id; the app SHALL answer with `permission.respond` over a short-lived connection, as it does for notification actions.

#### Scenario: Waiting for permission
- **WHEN** a registered session asks for a tool permission
- **THEN** the live status immediately shows "waiting for you" with the Deny / Allow buttons for that request

#### Scenario: Allow from the lock screen
- **WHEN** the user taps Allow on the activity
- **THEN** the app sends `permission.respond` `allow` for the pending request and the status returns to working once the daemon resolves it

#### Scenario: Turn finished
- **WHEN** a registered session fires `Stop`
- **THEN** the live status shows "done" and is dismissed after 15 minutes

#### Scenario: Next prompt within the window
- **WHEN** a registered session fires `Stop` and, 5 minutes later, `UserPromptSubmit`
- **THEN** the same activity shows working again and is not dismissed

### Requirement: Live status protocol
The protocol SHALL have `live.register { sessionId, platform, fcmToken, activityToken?, relay?, palette? }` (replies `ack`, replacing an earlier registration of the same session) and `live.unregister { sessionId }` (replies `ack`). `palette` carries the app theme colors used by the live status (`background`, `text`, `textMuted`, `accent`, `success`, `warning`); the daemon SHALL keep it with the registration and include it as `palette` in the props of every update it sends for that registration. The props SHALL also carry `glyphs` (newest first, at most five), `pending` (`{ requestId, tool, allow, deny }` or `null`), `hint` and `tasks` (the translated count of tasks running in parallel, empty when none), all with defaults so older daemons and apps interoperate. Registrations MAY be kept in memory only.

#### Scenario: New activity for the same session
- **WHEN** the app registers a second live status for a session
- **THEN** the daemon keeps only the latest registration

#### Scenario: Palette echoed
- **WHEN** the app registers with a palette and the daemon later sends a "waiting" update
- **THEN** the update's props carry the same palette

#### Scenario: Older app without a palette
- **WHEN** the registration has no palette
- **THEN** the props are sent without one and the widget renders with its dark defaults

#### Scenario: Pending in the props
- **WHEN** a tool permission is pending for a registered session
- **THEN** the props carry `pending` with the request id, the tool name and the translated Allow / Deny labels, and nothing else about the request

## ADDED Requirements

### Requirement: One live status per session
The app SHALL keep at most one Live Activity per session across app restarts, reconnects and over-the-air reloads. It SHALL persist which activity belongs to which session and, when it connects and when it returns to the foreground, SHALL compare that record with the activities iOS still has: it adopts the activity of each session that is working, waiting or inside its done window (updating it and registering it again with the daemon) and MUST end every other activity of the app, including any it cannot match to a session.

#### Scenario: App killed and reopened
- **WHEN** a session has a live status, the app is killed, reopened, and the session keeps working
- **THEN** the existing activity is adopted and no second one is started

#### Scenario: Orphan from an older run
- **WHEN** iOS still shows an activity that no saved record names
- **THEN** the app ends it on its next connect

#### Scenario: Over-the-air reload
- **WHEN** an update is applied and the JavaScript restarts while two sessions work
- **THEN** each session still has exactly one live status
