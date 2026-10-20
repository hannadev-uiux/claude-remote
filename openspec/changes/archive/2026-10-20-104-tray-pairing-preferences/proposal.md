## Why

Issue #160 asks for the menu bar shell. The menu-bar part shipped in change 65, and focusing a session already raises the terminal app. Still missing:

- pairing a phone from the menu bar: it only opens `remote-harness pair` in a terminal;
- preferences: they open the raw config file;
- a Quit that asks whether to stop the service too: today it only hides the icon, and the service keeps running;
- the SwiftUI popover with cards;
- the Windows tray.

## What Changes

- **Pair a phone** becomes a submenu:
  - on macOS, the pairing QR code drawn in the menu by the helper (CoreImage);
  - the `host:port` line;
  - "Show the pairing in the terminal" (today's action, with the token fallback);
  - "Rotate token…", whose confirmation item rotates the token and closes the paired phones' connections. They must pair again, as with `remote-harness rotate-token`.

  Without a WebSocket address yet (waiting for Tailscale), the item keeps today's behavior.
- **Preferences** becomes a submenu:
  - "Show permission requests here": a new config key `trayPermissions`, on by default. Off, the menu keeps "Waiting for you" with Open in terminal but drops Allow / Always / Deny.
  - "Keep the computer awake" with its three modes.
  - "Push notifications" (on = `auto`, off = `off`), applied at once.
  - "Open the config file…".

  Changes are written to the config (read → merge → atomic write) and applied without a restart.
- **Quit** under a service manager becomes a submenu with two choices:
  - "Hide the icon (the service keeps running)", today's action;
  - "Stop the service until the next login": `launchctl bootout` or `systemctl --user stop`.

  A foreground daemon keeps the plain "Quit tray".
- **Not in this change, left open in #160:** the SwiftUI popover with cards, a separate Preferences window (profiles, network) and the Windows tray. The menu keeps the same thin-client protocol, so the Linux helper gets the new submenus for free; it does not receive the QR item.

## Capabilities

### New Capabilities

### Modified Capabilities
- `desktop-updates`: the tray icon's Pair a phone, Preferences and Quit submenus

## Impact

- `apps/daemon/src/features/updates/menu.ts`: `qr` items, pairing, preferences and quit sections (tests)
- `apps/daemon/src/features/updates/index.ts`: click handling; `TrayShellDeps` gains pairing, token rotation, keep awake, push and service stop
- `apps/daemon/src/main.ts`: those deps (lazy WebSocket address, token rotation shared with `/admin/reload-token`)
- `apps/daemon/src/core/config.ts`: `trayPermissions`
- `apps/daemon/src/core/pairing.ts`: `pairingUrl`, moved from `cli.ts`
- `apps/daemon/src/features/push/index.ts`: `reloadMode`
- `apps/daemon/src/features/service`: `stopService` for launchd and systemd
- `apps/daemon/tray/macos/Tray.swift`: QR menu item
- daemon i18n
