## Context

Claude Code understands bracketed paste; `tmux paste-buffer -p` emits the bracketed paste sequences when the application has enabled them.

## Goals / Non-Goals

**Goals:** latency < 300 ms from tap to pane.

**Non-Goals:** detecting whether the TUI is in a dialog (the app shows the raw terminal for that, change 16).

## Decisions

- **Named buffer per session** (`-b cr-<sessionId>`) via `load-buffer -` reading from stdin (avoids escaping the text on the command line), `paste-buffer -p -d -b ... -t <pane>`, a short wait (80 ms) and `send-keys Enter`. The wait gives the TUI time to process the end of the paste before the Enter.
- **Per-session queue** (chained promise) so consecutive inputs do not interleave.
- **Key allowlist** in the module (`ALLOWED_KEYS`).
- **Fallback** (PRD risk): configuration option `inputStrategy: "paste" | "type"`; `type` mode uses `send-keys -l` + `Escape` before the Enter.

## Risks / Trade-offs

- [Enter arrives before the paste ends] → configurable wait (`pasteEnterDelayMs`).
