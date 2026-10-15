## Why

Sending prompts and unblocking the TUI from the phone is the app's second pillar (D4). Typing key by key triggers the TUI's autocomplete and breaks multi-line prompts.

## What Changes

- `session.input { sessionId, text }`: pastes the whole text with `tmux load-buffer` + `paste-buffer -p` (bracketed paste) and only then sends Enter.
- `session.key { sessionId, key }`: special keys via `send-keys` (`Enter`, `Escape`, `Up`, `Down`, `Left`, `Right`, `Tab`, `BTab`, `C-c`, `C-d`, digits 1-9 for menus).
- Pre-check: rejects input to a non-controllable session.
- `ack` on success, `error` with a code on failure.

## Capabilities

### New Capabilities
- `session-input`: sending text and keys to controllable sessions.

### Modified Capabilities

## Impact

`features/input` module in the daemon, using `TmuxClient`.
