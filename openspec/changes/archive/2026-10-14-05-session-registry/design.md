## Context

Transcripts live in `<configDir>/projects/<sanitized-cwd>/<sessionId>.jsonl`; `custom-title`/`agent-name` entries provide the title, and `permission-mode` the mode.

## Goals / Non-Goals

**Goals:** a list that is cheap to build (without reading whole transcripts).

**Non-Goals:** subagents and background tasks (change 18).

## Decisions

- **`TmuxClient`** in `infra/tmux` wraps `execa('tmux', ...)`: `listPanes`, `capturePane`, `sendKeys`, `pasteText`, `newWindow`. The only place that knows the tmux CLI; testable with a fake executor.
- **Scanning recent sessions**: `fs.readdir` over `projects/*` filtering by `mtime`; the title is obtained by reading only the last 64 KB of the file (looking for the last `custom-title` or `last-prompt` entry, or the first user message) and the `cwd` from entries that have a `cwd` field.
- **In-memory repository** (`SessionStore`) with a `Map<id, Session>`, emitting `session.updated` on the bus on each `upsert`. Persistence debounced by 500 ms.
- **Pane polling** every 5 s with `tmux list-panes -a -F '#{pane_id}'` (a cheap call).

## Risks / Trade-offs

- [Many old transcripts] → 7-day limit and at most 50 recent sessions per profile.
