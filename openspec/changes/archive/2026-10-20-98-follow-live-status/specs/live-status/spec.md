## ADDED Requirements

### Requirement: Follow a session
When the daemon announces `live.follow` and "Live status" is on, the session's More options menu and the session list's action sheet SHALL offer **Follow live status** / **Stop following**. A followed session SHALL show a "following" mark, with an accessible label, on its row and in its header. Following SHALL start the live status at once when the session is working or waiting; an idle session shows nothing until its next turn.

While a session is followed, each new turn (`UserPromptSubmit`) SHALL start its live status on that phone, even with the app in the background or closed. This happens only when the session has no live status yet, no app is in the foreground (the app in front starts its own), and neither the session nor its profile is muted. It starts:
- on Android, as the app-drawn notification, with the updates that follow;
- on iOS 17.2 or later, as a Live Activity started by push with the phone's push-to-start token. Its updates resume once the app registers the activity's own token;
- on older iOS, or before the app sent a push-to-start token, as a regular push "Session working" with the profile name, like the other notifications.

A session SHALL stop being followed when the user taps Stop following, when it ends, or after 12 hours without a turn. Turning "Live status" off SHALL stop following every session and turn auto-follow off. Follows MUST survive daemon restarts. The push-to-start payload follows the live status content rules. The fallback push carries only the state, the profile name and the session id. Texts MUST be translated.

#### Scenario: Follow a session working on the computer
- **WHEN** a session is working after a prompt typed on the computer and the user taps Follow live status in its menu
- **THEN** its live status starts and the session row shows the following mark

#### Scenario: Desktop turn with the app closed (Android)
- **WHEN** a followed session gets a prompt from the computer while the Android app is closed
- **THEN** the live status notification appears and keeps updating until the turn is done

#### Scenario: Desktop turn with the app in the background (iOS)
- **WHEN** a followed session gets a prompt from the computer, the iPhone runs iOS 18 and the app is in the background
- **THEN** a Live Activity for that session starts from the push, and the next time the app runs it adopts that activity instead of starting another

#### Scenario: Older iOS
- **WHEN** a followed session starts a turn on an iPhone without a push-to-start token
- **THEN** the phone receives the push "Session working" with the profile name, and tapping it opens the session

#### Scenario: Stop following
- **WHEN** the user taps Stop following
- **THEN** the mark disappears and later turns from the computer start no live status

#### Scenario: Idle for 12 hours
- **WHEN** a followed session has no turn for 12 hours
- **THEN** it is no longer followed

#### Scenario: Muted
- **WHEN** a followed session's profile is muted and the session starts a turn
- **THEN** no live status starts and no push is sent

#### Scenario: Daemon restart
- **WHEN** the daemon restarts and a followed session then starts a turn with the app closed
- **THEN** the live status starts as before the restart

### Requirement: Auto-follow new sessions
The profile's details sheet SHALL have a **Follow new sessions** switch (live status), off by default and kept by the daemon for this phone. While it is on, every new session of that profile SHALL be followed on this phone as if the user had tapped Follow live status.

#### Scenario: New session from the computer
- **WHEN** "Follow new sessions" is on for the profile "Work" and a new session of "Work" starts on the computer
- **THEN** the session shows the following mark, and its first turn starts the live status on the phone

### Requirement: Follow protocol
The protocol SHALL have:
- `live.follow { sessionId, device }`;
- `live.unfollow { sessionId, fcmToken }`;
- `live.autoFollow { profileId, enabled, device }`;
- `live.follows { device }`.

Each SHALL be replied with `live.followed { sessionIds, autoFollowProfiles }` for that phone. `device` is `{ platform, fcmToken, relay?, startToken?, startRelay?, palette?, androidDataMessages? }`: `startToken` is the iOS push-to-start token, and `startRelay` the relay grant that seals it. Every message carrying `device` SHALL refresh the stored delivery data of that phone. Following an ended or unknown session SHALL fail with `not_found`. `auth.ok` SHALL carry `live: { follow: true }` in daemons that support it; without it the app MUST NOT offer Follow. The daemon SHALL keep the follows per phone in a file written atomically.

#### Scenario: Refresh on connect
- **WHEN** the app connects and sends `live.follows` with a new FCM token
- **THEN** the daemon stores the new token for that phone and replies with its followed sessions

#### Scenario: Older daemon
- **WHEN** `auth.ok` has no `live` field
- **THEN** the app shows no Follow item and no mark

## MODIFIED Requirements

### Requirement: One live status per session
The app SHALL keep at most one Live Activity per session across app restarts, reconnects and over-the-air reloads. It SHALL persist which activity belongs to which session and, when it connects and when it returns to the foreground, SHALL compare that record with the activities iOS still has: it adopts the activity of each session that is working, waiting or inside its done window (updating it and registering it again with the daemon). It SHALL also adopt an activity that no record names when its deep link names a followed session that is working or waiting and has no activity yet (one started by push). It MUST end every other activity of the app, including any it cannot match to a session.

#### Scenario: App killed and reopened
- **WHEN** a session has a live status, the app is killed, reopened, and the session keeps working
- **THEN** the existing activity is adopted and no second one is started

#### Scenario: Orphan from an older run
- **WHEN** iOS still shows an activity that no saved record names and whose deep link names no followed session
- **THEN** the app ends it on its next connect

#### Scenario: Activity started by push
- **WHEN** the daemon started a Live Activity by push for a followed, working session and the app then connects
- **THEN** the app adopts that activity, registers its token with the daemon, and no second activity appears

#### Scenario: Over-the-air reload
- **WHEN** an update is applied and the JavaScript restarts while two sessions work
- **THEN** each session still has exactly one live status
