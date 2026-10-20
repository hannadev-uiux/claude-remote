## 1. Daemon: menu, wire types, config

- [x] 1.1 `menu.ts`: `MAX_TRAY_SESSIONS_WINDOW = 5` (helpers with windows) alongside the existing `MAX_TRAY_SESSIONS = 8` (helpers without); `buildTrayMenu` takes the cap and adds `rename:<id>` next to Focus/Close in each session submenu, plus a trailing `see-all` item when sessions were truncated and the helper supports windows
- [x] 1.2 `menu.ts`: wire types for the richer data sent alongside `items` — `TraySession` extended with `agent`/`updatedAt` for the Sessions window, a declarative `PrefRow`/`PrefSection`/`PrefTab` tree (same translated-by-the-daemon, dumb-renderer idiom as `TrayItem`) for the Preferences window, `TraySessionsWindow` for the Sessions window's chrome
- [x] 1.3 `config.ts`: optional `machineName` string; `displayHostName()` (`paths.ts`) used by `auth.ok`, push, live status and the tray's own status line
- [x] 1.4 `tray-menu.test.ts`: cap drops to 5 with a window helper and stays 8 without; `rename`/`see-all` ids present where expected; `prefsWindow`/`sessionsWindow` payload shapes

## 2. Daemon: click handling, rename, windows capability

- [x] 2.1 `tray-host.ts`: `onClick` callback gains an optional `value: string | undefined`; a new `onReady(windows: boolean)` callback reads the helper's `{type:'ready', windows}` (tests)
- [x] 2.2 `index.ts`: `onTrayClick` handles `rename:<id>` — controllable session: `shell.renameSession` (`InputService.sendText(id, '/rename ' + value)`, wired in `main.ts`); not controllable: `SessionStore.upsert` sets the alias as the title and a `pendingRenames` set re-sends it as `/rename` once the session becomes controllable again
- [x] 2.3 Alias tracking: a small `pendingRenames: Set<string>` in `updates/index.ts` (no `SessionStore` schema change — the alias is just the existing `title` field) plus a `store.onChange` listener for the resume-and-send behavior
- [x] 2.4 `index.ts`: `prefs`/`see-all` clicks are never sent by a windowed helper (it opens its own window locally from cached data) — the `prefs` fallback (`desktop.open(paths.config())`) only fires for Linux/no-shell; `pref:machine-name` (value), `pref:show-in-menu-bar` (off-only) and `pref:start-at-login` (via `LaunchdService`/`installServiceFromCli`) write through `updateConfigFile`/the service manager and reload
- [x] 2.5 `index.ts`/`menu.ts`: assemble and send the full `sessions`/`sessionsWindow`/`prefsWindow` payloads alongside the menu on every refresh, only when the helper reported `windows`

## 3. macOS helper (Tray.swift)

- [x] 3.1 `ready` message reports `windows: true`; decodes the new optional `sessions`/`sessionsWindow`/`prefsWindow` fields and the outgoing click message's optional `value`
- [x] 3.2 Rename: clicking `rename:<id>` (menu or Sessions window) shows an `NSAlert` with a pre-filled text field before emitting the click with `value`
- [x] 3.3 Preferences window: `NSWindow` + `NSHostingController`, a generic SwiftUI renderer of the `PrefRow` tree (toggle/text/value/picker/button/qr/note) — no per-field Swift code, every label already translated
- [x] 3.4 Sessions window: `NSWindow` + `NSHostingController`, searchable `List` from `sessions`, row actions Focus/Rename/Close (click ids) and Copy path (local `NSPasteboard`, no round trip)
- [x] 3.5 `swiftc -O apps/daemon/tray/macos/Tray.swift -o /tmp/tray-check` compiles clean (zero warnings); smoke-tested running the binary (emits `{"type":"ready","windows":true}` and exits cleanly on EOF)

## 4. i18n and verification

- [x] 4.1 Daemon i18n (pt-BR, en-US, es-ES): `rename`, `seeAllSessions`, Sessions/Preferences window chrome, tab labels, General/Notifications/Advanced row labels, rename-prompt strings; parity test green
- [x] 4.2 `pnpm turbo run typecheck test` green (1192 tests); `npx biome check --error-on-warnings apps packages openspec` clean; `openspec validate 112-tray-preferences-window --strict` passes

## Known gaps (documented, not silent)

- Updates/Profiles/Pairing/Notifications tab content is a reasonable first pass (channel+auto+check, read-only profile list, QR+address+rotate, push toggle), not a redesign of those flows.
- No manual, on-device verification of the actual window UI (layout, tab switching, live updates) — only compiled and smoke-tested headless. A human should sanity-check it in a real session before relying on it.
- Linux/Windows get the session cap change's groundwork (the daemon already sends the uncapped list) but no window UI, per the issue's own scope note.
