## Why

The tray's "Focus in tmux" session action only runs `tmux select-window`/`select-pane`, so it does nothing visible when no terminal is attached to the tmux server (the common case on a freshly started daemon) and does not switch a terminal that is attached to a different tmux session. The label is also written for developers, not the people the tray is meant to serve. (Issue #248)

## What Changes

- Rename the tray action from "Focus in tmux" to "Open in terminal (tmux)" (and its translations) in the tray menu (`Waiting for you` and `Sessions` sections).
- `TmuxClient` gains `listClients`/`switchClient` so the daemon can tell whether a terminal is already attached to the session and, if so, make that terminal's client show it (`switch-client`) instead of only changing the tmux server's internal active window.
- When at least one terminal is attached: switch its client to the session's window/pane, then bring the owning app to the front (macOS: detect which supported terminal app is running — iTerm2, Ghostty, WezTerm, kitty, Alacritty, Terminal.app, in that preference order — and activate it).
- When no terminal is attached: open a new terminal window running `tmux attach` for that session's window/pane, in the same auto-detected app on macOS, or `$TERMINAL`/`x-terminal-emulator` on Linux, or Windows Terminal (`wt.exe`) under WSL.
- Command building (which app, attach vs. switch, the exact command per app) is pure and unit-tested; only running the resulting command is a side effect in `infra/`.
- Errors (no supported terminal found, the process failing) are logged instead of failing silently; the tray action itself stays fire-and-forget as today (no new protocol round-trip).

## Capabilities

### New Capabilities

### Modified Capabilities
- `desktop-updates`: the tray's "Focus in tmux" action is renamed to "Open in terminal (tmux)" and actually attaches/switches a real terminal instead of only changing tmux's internal active window.

## Impact

`apps/daemon/src/infra/tmux.ts` (`listClients`, `switchClient`), `apps/daemon/src/infra/desktop.ts` (per-app open/activate commands, `listRunningApps` on macOS), a new pure module under `apps/daemon/src/features/pane/` for command planning, `apps/daemon/src/features/pane/index.ts` and `apps/daemon/src/features/updates/index.ts` (both call `pane.focus`/the tray's focus action), `apps/daemon/src/features/updates/menu.ts` (no code change, only the `focus` label consumer), `apps/daemon/src/core/i18n/{en-US,pt-BR,es-ES}.ts` (`focus` label text). No protocol schema change: `pane.focus` keeps its shape.
