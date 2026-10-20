## 1. Daemon

- [x] 1.1 `core/pairing.ts` (`pairingUrl` moved from `cli.ts`), `trayPermissions` in the config.
- [x] 1.2 `menu.ts`: `qr` items, Pair a phone, Preferences and Quit submenus, answers hidden when `trayPermissions` is off (tests).
- [x] 1.3 `stopService` for launchd and systemd (tests); push `reloadMode`.
- [x] 1.4 `TrayShellDeps` (pairing, rotateToken, keepAwake, push) wired in `main.ts`; click handling in the updates feature; daemon i18n.

## 2. Helper

- [x] 2.1 `Tray.swift`: `qr` menu item (CoreImage), compiled with `swiftc`.

## 3. Validation

- [x] 3.1 `pnpm check` green.
