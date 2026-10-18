## Why

The daemon runs in the background (launchd/systemd) with no visible presence on the computer. Updating is manual: the user has to know a new version exists and run `remote-harness update` (optionally `--ref` / `REMOTE_HARNESS_REF`). Without a terminal there is no way to tell whether the daemon is running, and no way to pick which branch to follow (#59).

## What Changes

- **Update channel and settings** in the daemon config: `update.channel` (`main`, stable, by default; or `development`) and `update.auto` (off by default). `remote-harness update` follows the channel instead of a hard-coded `main` (`--ref` and `REMOTE_HARNESS_REF` still override). Switching from `development` back to `main` warns that it may install an older version.
- **Background check.** In the installer's checkout only (never a development clone), the daemon fetches the channel's ref from the git remote 2 minutes after start and every 6 hours (`git fetch --depth 1`, no other network calls). When a newer commit exists it shows a native desktop notification once per commit: "Remote Harness X.Y.Z available" (`osascript` on macOS, `notify-send` on Linux).
- **Automatic updates (opt-in).** With `update.auto` on, an available update is applied at a quiet moment: no session running or waiting, and no pending permission. It runs the existing `remote-harness update` flow in a detached process that survives the service restart. Downgrades are never applied automatically.
- **Tray / menu bar icon.** A small helper process shows the daemon is running, with: status and version, "Check for updates", "Update now", "Automatic updates" toggle, channel `main` / `development`, "Open logs", "Restart daemon", "Run doctor", "Quit tray". Helpers: a Swift program compiled on first use on macOS (menu bar), a Python AppIndicator script on Linux (where `gi` + AppIndicator are available). The daemon talks to it over stdin/stdout (JSON lines), so there is no extra port or secret. Without a helper (no GUI, missing toolkit, WSL) the daemon keeps working headless. Config `tray: false` turns it off.
- **CLI** `remote-harness updates status|check|channel [main|development]|auto <on|off>`, applied to the running daemon without a restart.
- Texts in pt-BR, en-US and es-ES (notifications, tray menu, CLI).

## Capabilities

### New Capabilities
- `desktop-updates`: update channel, background check with desktop notification, opt-in automatic updates, tray icon.

### Modified Capabilities

## Impact

- `apps/daemon`:
  - Config `update` and `tray`.
  - `features/updates/` (pure channel/version logic, checker, quiet-moment rule, tray menu, feature wiring).
  - `infra/desktop.ts` (notifications, open folder, terminal command, detached runner).
  - `infra/tray-helper.ts` (build/locate and spawn the helper).
  - `tray/macos/Tray.swift`, `tray/linux/tray.py`.
  - CLI `updates`, `update` default ref, admin routes, i18n.
- The mobile app is unchanged (the issue leaves exposing this state to the app for later).
