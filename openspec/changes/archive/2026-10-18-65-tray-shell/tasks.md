## 1. Protocol and daemon

- [x] 1.1 `pane.focus` in the protocol (fixture), `TmuxClient.focusPane`, handler in the pane feature
- [x] 1.2 `TrayMenu.icon` and the shell sections in `buildTrayMenu` (status with machine and since, Waiting for you with Allow / Always / Deny / Focus, Sessions with Focus / Close and the ended submenu, Phones, New session…, Pair a phone…, docs, Preferences…), `pendingSummary`; tests
- [x] 1.3 Updates feature: menu state from the session store, the permission broker and the device registry, debounced refresh, click handling for the new ids; `main.ts` wiring; i18n `updates.tray` in pt-BR, en-US, es-ES

## 2. Helpers

- [x] 2.1 macOS helper draws the glyph per `icon` (template idle, filled ring working, amber dot waiting, 40 % offline); Linux helper sets the attention status while waiting

## 3. Verification

- [x] 3.1 `pnpm check` green; the Swift helper type-checks and the Python helper byte-compiles
