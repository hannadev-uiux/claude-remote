## MODIFIED Requirements

### Requirement: Live status content
The live status SHALL show, on the iOS lock screen: the app mark as the only icon; `<profile> · <machine>` (the computer's host name, falling back to the profile name); the session name; the session folder (home shortened to `~`); a large tabular timer of the turn in the state color; a state line with the state name, the current step category and the tool count; a row with the glyphs of the last five step categories (`⌘` command, `✎` edit, `⌕` search, `⇄` web, `⌥` subagent, `?` permission, `·` other), the current one in the state color; and an indeterminate bar while working. Color MUST encode only the state (working = accent, waiting = warning, done = success, closed = muted text), on the border, the timer, the state line and the current glyph, with the colors coming from the `palette` in the props and falling back to the dark theme values. While a tool permission waits, the banner SHALL show Deny and Allow buttons that answer it (see Live status updates). When the turn is done, the timer MUST freeze at the turn's duration with the "total" hint; when the session closed, the banner stays muted with the hint that the transcript is kept. In the Dynamic Island the compact view SHALL show the mark and the timer (or the current glyph), the minimal view the mark and a state dot, and the expanded view the lock screen content. Tapping it MUST open the session. Push payloads for the live status MAY contain the session title and its working directory, and MUST NOT contain any other session content: only the profile and host names, the state, step categories from a fixed table derived from the tool name (with the tool name), glyphs, the tool count, the pending request id and tool name with the button labels, timestamps and the palette. Texts SHALL be translated (pt-BR, en-US, es-ES). On Android the notification body SHALL carry the state, the step, the tool count and the glyph row.

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

### Requirement: Live status updates
The daemon SHALL keep registered live statuses up to date through FCM while the session is registered: `UserPromptSubmit` → working (new start time), a permission request or a waiting notification → waiting for you (a tool permission also sets `pending` with its request id and tool), the permission resolution → working (pending cleared), transcript tool/thinking/text entries → step, glyph and tool count, `Stop` → done, `SessionEnd` → closed. State and pending changes MUST be sent immediately; step and count changes at most every 15 seconds. On `Stop` it MUST end the activity with a dismissal 15 minutes later (Android: a final, non-persistent notification), and on `SessionEnd` it MUST end it right away. On iOS the update uses the activity push token; on Android a notification with a per-session tag on the low-importance "Live status" channel. The Deny / Allow buttons of the activity SHALL reach the app as interactions whose target names the decision and the request id; the app SHALL answer with `permission.respond` over a short-lived connection, as it does for notification actions.

#### Scenario: Waiting for permission
- **WHEN** a registered session asks for a tool permission
- **THEN** the live status immediately shows "waiting for you" with the Deny / Allow buttons for that request

#### Scenario: Allow from the lock screen
- **WHEN** the user taps Allow on the activity
- **THEN** the app sends `permission.respond` `allow` for the pending request and the status returns to working once the daemon resolves it

#### Scenario: Turn finished
- **WHEN** a registered session fires `Stop`
- **THEN** the live status shows "done" and is dismissed after 15 minutes

### Requirement: Live status protocol
The protocol SHALL have `live.register { sessionId, platform, fcmToken, activityToken?, relay?, palette? }` (replies `ack`, replacing an earlier registration of the same session) and `live.unregister { sessionId }` (replies `ack`). `palette` carries the app theme colors used by the live status (`background`, `text`, `textMuted`, `accent`, `success`, `warning`); the daemon SHALL keep it with the registration and include it as `palette` in the props of every update it sends for that registration. The props SHALL also carry `glyphs` (newest first, at most five), `pending` (`{ requestId, tool, allow, deny }` or `null`) and `hint`, all with defaults so older daemons and apps interoperate. Registrations MAY be kept in memory only.

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
