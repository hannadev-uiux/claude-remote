## Context

Claude Code supports `type: "http"` hooks with `url`, `headers`, `timeout` and `allowedEnvVars` (`$VAR` interpolation in headers). This removes the need for intermediate scripts.

## Goals / Non-Goals

**Goals:** link session ↔ tmux pane ↔ profile without any extra call from the launcher.

**Non-Goals:** supporting shells other than zsh in v1.

## Decisions

- **Direct HTTP hooks**: headers `X-Claude-Remote-Secret` (literal), `X-Claude-Remote-Pane: $TMUX_PANE` and `X-Claude-Remote-Profile: $CLAUDE_REMOTE_PROFILE`, with `allowedEnvVars: ["TMUX_PANE","CLAUDE_REMOTE_PROFILE"]`. Outside tmux the headers arrive empty and the session becomes read-only.
- **Hook tagging**: the URL contains the daemon's `/hooks/` at `127.0.0.1:<port>`; the installer identifies its own hooks by URL, without extra fields that Claude Code might reject.
- **Timeouts**: 5 s for informational events; `PermissionRequest` with a configurable timeout (default 300 s).
- **Launchers as zsh scripts** generated in `~/.claude-remote/bin/` from a template with the profile embedded; they use `tmux new-window -P -F '#{pane_id}'` and `attach`/`switch-client`.
- **Profile also detected from `transcript_path`** (the `configDir` prefix) as redundancy.
- **Safe JSON writing**: read, merge, write to a temporary file and atomic `rename`.

## Risks / Trade-offs

- [Hook format changes] → the installer centralizes building the block in a single tested function.
- [User later edits `settings.json` by hand] → merging by URL is tolerant.
