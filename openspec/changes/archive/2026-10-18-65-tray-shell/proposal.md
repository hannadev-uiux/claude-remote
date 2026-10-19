# 65 · Tray: sessions, pending permission, pairing and actions in the menu bar

## Why

The tray only knows about updates: a status line and the update controls. #160 (epic #162) turns it into the computer-side shell of the prototypes: the glyph tells the state at a glance, a pending permission can be answered from the Mac, the sessions are one click from their tmux window, and pairing, docs and preferences are reachable without the terminal. The tray stays a thin client: the helper renders what the daemon sends as JSON lines and reports clicks.

## What Changes

- **Glyph states**: the menu message carries `icon`: `idle` (template mark), `working` (filled ring), `waiting` (amber dot, the only color) or `offline` (40 % opacity). Linux sets the indicator's attention status while waiting.
- **Menu**, top to bottom: status (`machine · version · since HH:MM`); **Waiting for you** with the oldest pending tool permission (`title · Tool · detail`) and Allow / Always allow (when the daemon suggested a rule) / Deny / Focus in tmux; **Sessions** by recency (`title · state`, each with folder · profile · worktree, Focus in tmux and Close session), ended sessions collapsed in one submenu; **Phones** (registered count, push on/off); New session… (the first profile's launcher in a terminal), Pair a phone… (`remote-harness pair` in a terminal), Open the docs, Preferences… (the config file); then the update controls as today. The menu refreshes on session and permission changes (debounced).
- **Protocol / daemon**: `pane.focus { sessionId }` selects the session's tmux window and pane (used by the tray and available to the app); `TmuxClient.focusPane`. Closing from the tray reuses the graceful close of change 57.
- Copy in pt-BR, en-US and es-ES (daemon catalogs).

## Out of scope (kept on the issue)

The SwiftUI popover with cards and the pairing QR, the Preferences window, the Windows tray, "Quit" asking about the service, and bringing the terminal app to the front: they need native UI work beyond the JSON-lines menu this change keeps.

## Impact

- `packages/protocol/src/client.ts`, `apps/daemon/src/infra/tmux.ts`, `features/pane/index.ts`, `features/updates/{menu,index}.ts`, `main.ts`, `tray/macos/Tray.swift`, `tray/linux/tray.py`, `core/i18n/*.ts`, tests.
- Specs: `desktop-updates` (MODIFIED Tray icon), `raw-terminal` (ADDED Focus the pane), `protocol` (MODIFIED Message catalog).
