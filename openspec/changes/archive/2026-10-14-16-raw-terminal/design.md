## Context

`tmux capture-pane -p -e -t <pane>` returns the visible content with color escapes.

## Goals / Non-Goals

**Goals:** reading the pane; input via the key bar.

**Non-Goals:** free typing inside xterm.

## Decisions

- **Polling** `capture-pane` every 250 ms per pane that has subscribers, with a hash (not `xxhash`; `crypto.createHash('sha1')`) so frames are only sent when something changed.
- **WebView with inline HTML** loading xterm.js and addon-fit embedded as a string generated at build time (`scripts/build-xterm-html.ts`), with no network. Each frame: `term.reset()` + `term.write(text.replace(/\n/g, '\r\n'))`.
- **Communication** RN → WebView via `injectJavaScript` with escaped JSON.

## Risks / Trade-offs

- [Polling cost] → only active while the tab is open.
