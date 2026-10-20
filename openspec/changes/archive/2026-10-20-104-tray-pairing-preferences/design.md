## Context

The tray is a thin client. `buildTrayMenu` (pure) builds `{ type: 'menu', items }`, the helper renders it and reports clicks by id, and the updates feature handles the ids. The pairing URL needs the token, the WebSocket host and the port. The host is only known after `waitForWsHost`, which runs after the features are registered. The token is reloaded by `/admin/reload-token`. Keep awake and push already reload from the config through admin routes.

## Decisions

- **QR as a menu item type.** `{ type: 'qr', text }`. The macOS helper renders it as an `NSMenuItem` whose view is an `NSImageView` with a `CIQRCodeGenerator` image, scaled without interpolation (200 pt). The daemon sends it only on macOS (`TrayMenuState.qr`). The Linux helper would show an empty item, so it does not get one. The QR holds the same `claude-remote://pair?…` link that `remote-harness pair` prints, on the computer's own screen only.
- **Lazy pairing.** `main.ts` keeps the WebSocket endpoint in a variable set once the server listens. The shell's `pairing()` returns `null` before that, and the menu then keeps the single "Pair a phone…" item.
- **One token rotation.** `rotateToken()` in `main.ts` stores a new token, then runs the same reload as `/admin/reload-token`: it closes the connections and emits `token.rotated`. The admin route calls the same function. The confirmation is a nested item, "Rotate token…" → "Rotate and sign out the paired phones", because a menu cannot show a dialog.
- **Preferences write the config.** Each toggle calls `updateConfigFile` (read → merge → atomic write), then applies the change:
  - **Keep awake:** `KeepAwakeController.setMode`. The controller is registered after the updates feature, so the shell reads it through a lazy reference.
  - **Push:** the push feature's `reloadMode()`, extracted from `/admin/push-mode`.
  - **`trayPermissions`:** the updates feature's own settings reload.
- **Stopping the service.** `stopService` runs `launchctl bootout gui/<uid>/<label>` or `systemctl --user stop <unit>`. The definition stays installed, so the service starts again at the next login (launchd `RunAtLoad`, systemd `enabled`). It is offered only under a service manager. The tray is hidden first, then the service manager stops the daemon with SIGTERM, which runs the normal shutdown.

## Risks / Trade-offs

- [A menu is a poorer surface than the designed popover] → It works on every helper today. The popover is a later step and can reuse the same state.
- [`launchctl bootout` from inside the job] → launchd handles the request and signals the job. The daemon's graceful stop answers SIGTERM as it does for `service uninstall`.
