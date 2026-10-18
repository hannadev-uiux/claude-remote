## Why

The live status shows a big state icon, the state as a title, the step and a timer: it says *that* something runs, but not *where*. With several sessions on several computers the user cannot tell them apart on the lock screen, the timer keeps counting after the turn ends, and there is no sense of how long a session has been waiting.

## What Changes

- **New lock screen layout** (iOS Live Activity), top to bottom: the app icon; the daemon name (the computer's host name) with the turn's elapsed time; the session name; the session folder (home shortened to `~`); the latest steps of the turn (up to 3, newest first, repeated steps collapsed with a count).
- **State as a border**: the state no longer has its own icon and title; a colored border around the banner signals it (orange working, yellow waiting, green done, gray closed). A footer keeps the state name with a live counter since it last changed ("Waiting · 10 min ago").
- **Timer stops at the end of the turn**: when the turn is done (or the session closed) the elapsed time freezes at the turn's duration instead of counting on.
- **Dynamic Island** follows: expanded shows the host and timer on top, the session, folder and state counter below.
- **Content rule relaxed on purpose**: the live status payload now carries the session title and its working directory, by the user's choice, so activities can be told apart. The title may come from the first prompt. Tool inputs and outputs are still never sent: steps are fixed categories plus the tool name.
- `auth.ok` gains an optional `host` (the daemon computer's name), so the app can fill the header of activities it starts.
- Android: the notification title uses the session name; the body keeps the step and tool count.

## Capabilities

### New Capabilities

### Modified Capabilities
- `live-status`: content (host, session, folder, recent steps, state border, state-change counter, timer frozen at the end) and payload rule (session title and folder allowed).

## Impact

- `packages/protocol`: `LiveStatusProps` gains `host`, `session`, `path`, `recent`, `ago`, `changedAt`, `endedAt` (all with defaults, so older payloads still render); `auth.ok.host` (optional).
- `apps/daemon`: `features/live-status` reducer tracks recent steps, state change and end times; props built with the session title, folder and host; `ago` text in the three catalogs; `auth.ok` sends the host name.
- `apps/mobile`: new `SessionActivity` layout, an asset catalog with the app icon in the widget extension (config plugin + generated `live-activity-icon.png`), local props with the new fields, local updates only when the daemon does not keep the activity updated; Settings hint updated in the three languages. **Needs a new app build** (widget extension assets).
