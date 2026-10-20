## ADDED Requirements

### Requirement: Android live status drawn by the app
An Android app that can draw the live status itself SHALL send `androidDataMessages: true` in `live.register`. For such a registration the daemon SHALL send each update as an FCM data message, with no `notification` block. Its `data` has `sessionId`, `event: "live"` and `live`, the JSON of `{ event, props }` (`LiveDataMessageSchema`). The message SHALL have `collapseKey` `live-<sessionId>` and priority `normal` for working updates and `high` otherwise (waiting, done, closed or an end), like `apns-priority`. A registration without the flag MUST keep the system-drawn notification.

The app SHALL draw the notification itself, whether it is in the foreground, in the background or closed:
- the per-session identifier, so each update replaces the last, on the low-importance "Live status" channel;
- the title and body of `liveNotificationText`;
- ongoing while working or waiting;
- when `pending` is set, **Allow** and **Deny** actions labeled with `pending.allow` and `pending.deny`.

An action SHALL answer with `permission.respond` over a short-lived connection without opening the app. On success, the notification SHALL drop its actions at once. On failure, the app SHALL open the session when it is running; with the app closed, the buttons stay so the user can try again. One tap MUST answer the request once, even when Android delivers it to both the background task and the app. When the app's binary cannot run background tasks, the actions SHALL open the app and answer from there. Tapping the notification MUST open the session.

#### Scenario: Allow from the Android notification
- **WHEN** a registered session on an Android phone with `androidDataMessages` waits for a tool permission and the user taps Allow on the live status notification while the app is closed
- **THEN** the app answers `permission.respond` `allow` for that request in the background, the notification loses its buttons and then shows working once the daemon resolves it

#### Scenario: Older app
- **WHEN** an Android app registers without `androidDataMessages`
- **THEN** the daemon keeps sending the system-drawn notification with the per-session tag

#### Scenario: Translated buttons
- **WHEN** the daemon speaks pt-BR and a permission is pending
- **THEN** the Android notification's actions read "Permitir" and "Negar"
