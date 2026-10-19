# 73 · Update the daemon from the app

## Why

Updating the daemon needs a terminal on the computer (`remote-harness update`), or the tray (#59). From the phone the user sees the daemon version but cannot update it nor pick the channel, so after an app update that needs a newer daemon, features silently stop working until someone reaches the computer (#65).

## What Changes

- **Protocol**: `daemon.update.check { channel?, force? }` and `daemon.update.start { channel }` (client); `daemon.update.info { info }` (server), the reply to both and broadcast on every progress change. `DaemonUpdateInfo`: running version, channel, last check, whether a check is running, the available update (`version`, `commit`, `downgrade`), what blocks updating from here (`not-installer`, `not-built`, `no-service`), `busy` (a session runs, waits or has a pending permission) and the last or current run. `auth.ok` gains an optional `update: { channel }`, telling the app the daemon supports this.
- **Run record**: `remote-harness update` writes `~/.remote-harness/update-run.json` at each step (`fetching`, `building`, `restarting`, then `done` or `failed`), with versions, commit, error and whether it rolled back; the new daemon marks `restarting` as `done` when it starts. So the app reads the outcome after reconnecting.
- **Rollback**: when the build of the new version fails, `update` checks out the previous commit and rebuilds it, so the service never restarts into a broken build and the phone keeps access to the computer.
- **Daemon**: the updates feature answers the messages with the existing checker and detached updater (the same flow as the tray's "Update now"). A channel in `check` is saved to the config like the tray's channel choice. `start` refuses (`bad_request`) when blocked, already running or nothing is available; it never runs without the app's confirmation. While a run is in progress the daemon re-reads the record every second and broadcasts the changes. Only the service daemon of the installer's checkout can update; others report why.
- **App**: Settings → **Daemon** card (between Notifications and the route's cards): version and channel, `main` / `development` selector, "Check for updates", the available version, "Update the computer" with a confirmation that warns about a downgrade (development → main) and about busy sessions, progress (fetching, building, restarting), the reconnect and the new version, or the error and whether it rolled back. Daemons without `update` in `auth.ok` show the terminal command instead.
- Copy in pt-BR, en-US and es-ES.

## Impact

- Protocol: `src/{domain,client,server}.ts`, fixtures.
- Daemon: `src/features/updates/{run,remote,index}.ts`, `src/cli.ts` (`update`), `src/core/paths.ts`, `src/main.ts`, i18n, tests.
- App: `src/features/settings/DaemonUpdateCard.tsx`, `src/features/settings/daemon-update.ts` (pure helpers), `src/app/(main)/settings.tsx`, i18n, tests.
- Specs: `desktop-updates` (ADDED Update from the app, ADDED Update run record), `protocol` (MODIFIED Message catalog), `app-shell` (MODIFIED Settings screen).
