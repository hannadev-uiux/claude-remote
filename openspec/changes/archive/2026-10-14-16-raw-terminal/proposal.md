## Why

TUI menus and dialogs do not show up in the transcript; without seeing the pane, the user is blind when something unexpected happens (D10, A8).

## What Changes

- Daemon: `pane.subscribe { sessionId }` sends `pane.frame` with the pane content (with ANSI colors) whenever it changes, at most 4 frames per second.
- App: "Terminal" tab in the session with xterm.js in a WebView, showing the pane, plus a key bar.

## Capabilities

### New Capabilities
- `raw-terminal`: mirror of the tmux pane in the app.

### Modified Capabilities

## Impact

`features/pane` module in the daemon; `src/features/terminal` in the app; `react-native-webview` dependency, xterm.js embedded as HTML.
