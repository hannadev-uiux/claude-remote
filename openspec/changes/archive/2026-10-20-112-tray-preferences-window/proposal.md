## Why

The tray's "Preferences…" still opens the raw `config.json` in a text editor (`desktop.open(paths.config())`, `apps/daemon/src/features/updates/index.ts`): no validation, and anything beyond the handful of settings already in the Preferences submenu (permissions, keep awake, push) needs hand-editing JSON. The tray menu also lists every live session up to `MAX_TRAY_SESSIONS = 8`, with no way to see the rest or rename one from the computer (#230).

## What Changes

- **Preferences window (macOS, SwiftUI)**, replacing "Preferences…"'s JSON-file behavior: a native window with tabs General (machine name, show in menu bar, show permission requests here, start at login), Updates (channel, automatic updates, check now — the existing update state and actions), Notifications (push notifications & live status — the one `push` setting covers both; a line pointing to the app for per-session mute rules, out of scope here), Profiles (read-only list: name, agent, color), Pairing (the existing QR/address/rotate-token, moved from the menu's Pair submenu into a tab) and Advanced (open the config file, open the logs folder, run doctor). Edits are written through the daemon (read → merge → backup → atomic write, the existing `updateConfigFile`) and applied live, the same way the current Preferences submenu's toggles already do.
- **Tray menu: 5 sessions + "See all sessions…"** (macOS only in this change). `MAX_TRAY_SESSIONS` drops to 5 live sessions in the menu (waiting-for-you session first implicitly via the existing pending section, then by recency as today); a new `see-all` item opens a **Sessions window** (SwiftUI): a searchable table of every session (name, folder, agent, state, started-at), updated live from the same tray push, with per-row actions Focus (reuses `focus:<id>`), Rename (new), Close (reuses `close:<id>`) and Copy path (client-side, no daemon round trip). Linux (`tray/linux/tray.py`, a generic JSON-lines menu renderer with no window support) and Windows keep today's 8-session cap and no "See all" item; the daemon sends the uncapped session list to every helper, but only the ones that know how to open a window ask for it.
- **Rename from the tray.** New per-session menu action "Rename…" (`rename:<sessionId>`), also in the Sessions window. The macOS helper prompts for a name locally (small alert with a text field, pre-filled with the current title) and sends it back on the existing click message, which gains an optional `value`. The daemon's `InputService.sendText` already exists for delivering text to a pane: a controllable session gets `/rename <name>` sent to its tmux pane, which Claude Code and Codex each handle as their own `/rename` and which the daemon already tracks afterwards through the existing `custom-title` transcript watcher (`features/sessions/transcript-meta.ts`) — no new title-storage path for controllable sessions. A session with no live pane (not yet resumed) gets a daemon-side alias (`SessionStore`) shown instead of the title until it is controllable again.
- **Protocol (helper JSON lines, daemon-local, not `packages/protocol`):** `TrayMenu` gains an optional `sessions` field (the full, uncapped list, richer than the menu's `TraySession`: folder, agent id, `startedAt`) and an optional `prefsWindow`/`profiles` payload for the Preferences window's current values. The click message the helper sends back gains an optional `value` (used by `rename:<id>` and the new `pref:machineName` edit); every other click keeps sending just `id`, unchanged.
- Linux and Windows keep their current tray behavior unchanged in this PR (8-session cap, text-only Preferences via the config file, no rename, no windows) — `tray.py` ignores the new `sessions`/`prefsWindow`/`profiles` fields harmlessly, same as it already ignores `qr`.

## Capabilities

### Modified Capabilities
- `desktop-updates`: "Tray icon" (session cap/See-all for helpers with a window), "Tray preferences" (window instead of submenu, on helpers that support it), new "Sessions window" and "Session rename from the tray" requirements.

## Impact

- `apps/daemon/src/features/updates/menu.ts`: `MAX_TRAY_SESSIONS` → helper-reported cap, `rename`/`see-all` ids, wire types for the Sessions/Preferences window payloads (tests).
- `apps/daemon/src/features/updates/index.ts`: `onTrayClick` reads the optional `value`; new `rename:<id>` handling via `InputService.sendText` with a `SessionStore` alias fallback; `prefs` click opens the window when the helper supports it, else keeps opening the config file; new config reads/writes for `machineName` and start-at-login (via `features/service`).
- `apps/daemon/src/features/updates/tray-host.ts`: `onClick` callback gains the optional `value`.
- `apps/daemon/src/core/config.ts`: new optional `machineName`.
- `apps/daemon/src/features/sessions/store.ts`: per-session alias for not-yet-controllable sessions.
- `apps/daemon/tray/macos/Tray.swift`: SwiftUI Preferences and Sessions windows, rename alert, `windowsCapable: true` reported on `ready`.
- `apps/daemon/tray/linux/tray.py`: unaffected (ignores unknown fields).
- Daemon i18n (`core/i18n/*.ts`): new tray strings (rename, see-all, window tab/section labels).
- `openspec/specs/desktop-updates/spec.md`.
