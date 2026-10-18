## Context

`remote-harness update` (`SourceUpdater` + `install.sh --update` + `update --finish`) already updates the installer's checkout (`~/.remote-harness/src`), rebuilds and restarts the service. `updateSource` refuses development clones. The service is a launchd LaunchAgent (KeepAlive) or a systemd user unit (`Restart=always`).

## Goals / Non-Goals

**Goals:** know about new versions without a terminal; opt-in hands-off updates; a visible "it is running" indicator with the common actions; a persistent channel.

**Non-Goals:** showing this state in the mobile app (later); a Windows tray for WSL (no reliable stdio bridge to a WinForms process was tested; WSL stays headless); notification action buttons (osascript has none; the tray carries "Update now").

## Decisions

- **Config.** `update: { channel: 'main' | 'development', auto: boolean }` (defaults `main`, `false`) and `tray: boolean` (default `true`). The CLI and the tray write it with `updateConfigFile` (read → merge → backup → atomic write) and ask the running daemon to reload (`POST /admin/updates-reload`).
- **Check** (`UpdateChecker`): `SourceUpdater.fetch(channel)` with the result persisted in `~/.remote-harness/updates.json` (`checkedAt`, `channel`, `available { version, commit, downgrade }`, `notifiedCommit`). It runs at most every 6 hours; a forced check (menu, CLI) at most once a minute. A dirty checkout or a failed fetch keeps the previous result and is logged. A notification goes out once per new commit.
- **Version comparison** (`compareVersions`, numeric `x.y.z`, pre-release ignored) marks `downgrade` when the fetched `apps/daemon/package.json` version is lower than the running one. Downgrades are notified ("switching to main installs an older version") but never auto-applied.
- **Quiet moment** (pure `isQuietMoment(sessions, hasPendingPermission)`): no session `running` or `waiting` and no pending permission request. With `auto` on, the checker re-evaluates every 10 minutes while an update is available.
- **Running the update** (`runDetachedUpdate`): `node <cli> update --ref <channel>` with output to `logs/update.log`. Under systemd (`INVOCATION_ID` set and `systemd-run` present) it goes through `systemd-run --user --collect` so the restart of our unit does not kill it. Otherwise it is spawned detached in its own process group (launchd does not kill it).
- **Tray protocol** (JSON lines). The daemon sends `{ type: 'menu', tooltip, items }`, where items are `{ id, label, enabled?, checked? }`, `{ type: 'separator' }` or `{ type: 'submenu', label, items }`. The helper answers `{ type: 'click', id }` and `{ type: 'ready' }`. The daemon builds every label already translated (`buildTrayMenu`, pure), so the helpers are dumb renderers. EOF on stdin makes a helper exit.
- **Helpers.**
  - macOS: `tray/macos/Tray.swift` is compiled with `swiftc` into `~/.remote-harness/tray/RemoteHarnessTray-<source hash>` the first time (Command Line Tools ship `swiftc`; git on macOS already needs them). It uses `NSStatusItem`, the `terminal` SF Symbol as a template image, and `.accessory` activation policy (no Dock icon).
  - Linux: `tray/linux/tray.py` (`python3` with `gi`, Gtk 3 and AyatanaAppIndicator3 or AppIndicator3). It needs `DISPLAY` or `WAYLAND_DISPLAY`.
  - A helper that fails within 5 s marks the tray unavailable until the next start. A crash later is retried up to 3 times, and "Quit tray" stops it for this run.
- **Where it runs.** The tray and the checker start only from `remote-harness start` without `--dev`, which is what the service runs. Tests and development daemons never spawn them. "Restart daemon" is offered only under a service manager (`XPC_SERVICE_NAME` / `INVOCATION_ID`): the daemon stops cleanly and exits, and KeepAlive / `Restart=always` brings it back.
- **Desktop actions** (`infra/desktop.ts`):
  - Notifications: `osascript -e 'display notification …'` on macOS, `notify-send -a "Remote Harness"` on Linux. Elsewhere they are only logged.
  - Open logs: `open` / `xdg-open`.
  - Doctor: a Terminal window via `osascript` on macOS; `x-terminal-emulator -e` on Linux.

## Risks / Trade-offs

- The Swift build takes a few seconds on first start and needs the Command Line Tools; without them the daemon stays headless and logs why.
- GNOME without the AppIndicator extension shows no tray; the daemon still notifies through `notify-send`.
- `osascript` notifications are attributed to Script Editor and follow its notification settings.
