## Why

Remote Harness only follows Claude Code (issue #108). Change 66 introduced the agent adapter and the `agent` field, but `codex` profiles are still dropped because no adapter exists. Research on Codex CLI 0.163 (source of `openai/codex`, October 2026) shows it now has what the daemon needs: a hooks system with the same event names and stdin fields as Claude Code (`SessionStart`, `UserPromptSubmit`, `PermissionRequest` that can allow or deny, `Stop`, `SessionEnd`; `session_id`, `transcript_path`, `cwd`, `tool_name`, `tool_input`), JSONL rollouts under `$CODEX_HOME/sessions/YYYY/MM/DD/`, `codex resume <id>`, and a `CODEX_HOME` config dir.

## What Changes

- **Codex adapter** in the daemon: `codex` command, `CODEX_HOME` (default `~/.codex`), `codex resume <id>`, no worktree flag, rollouts under `sessions/`. The adapter interface grows with what differs: the transcript format, how transcripts are found and summarized (title, cwd, mode), the built-in slash commands, input timing and the hooks file.
- **Rollout parser** (`features/transcript/codex-format.ts`, the only code that knows the Codex format): paginated and legacy rollouts become the normalized entries (prompts with images, replies, reasoning summaries, `exec` and `apply_patch` tool calls with their results, turn duration, interruptions, compaction). The approval policy of the latest `turn_context` / `thread_settings_applied` updates the session.
- **Hooks**: `remote-harness install` / `setup` merge command hooks into `$CODEX_HOME/hooks.json` (read → merge → backup → atomic write, idempotent, removable) that post to the daemon like Claude Code's, so sessions are linked to their tmux pane, change state, end, push "done" and ask permissions on the phone (Allow / Deny; no "Always", Codex hooks cannot add rules). Codex asks the user to trust new hooks once in the TUI; setup and doctor say so.
- **Launchers** for Codex profiles: `CODEX_HOME` instead of `CLAUDE_CONFIG_DIR`, `codex` instead of `claude`, no provider block.
- **Protocol**: `approvalPolicy` (nullable, default null) on `Session`, the Codex mode shown as the mode chip.
- **Input**: Codex treats fast input followed by Enter within 120 ms as a paste, so its Enter waits at least 250 ms after the paste.
- **App**: the mode chip of a Codex session shows its approval policy (read-only; `/permissions` opens the terminal); `exec` and `apply_patch` tool calls get readable labels, fields and a diff; the worktree toggle is hidden for agents that cannot start in one.
- **Setup and doctor**: `~/.codex` is detected and offered as a Codex profile; doctor checks `codex` on the PATH and the hooks of Codex profiles. `codex` becomes a reserved alias.
- Never offered from the app: `--dangerously-bypass-approvals-and-sandbox` / Full Access (the app cannot change Codex permissions at all in this change).

## Capabilities

### New Capabilities
- `codex-sessions`: following and controlling Codex CLI sessions.

### Modified Capabilities
- `protocol`: `approvalPolicy` on sessions.
- `app-conversation`: Codex mode chip and tool calls.

## Impact

`packages/protocol` (Session field), `apps/daemon` (agents, transcript, sessions, hooks installer and launcher, input, mode, autocomplete, permissions, setup, doctor, i18n), `apps/mobile` (mode chip, tool summaries and diff, new session worktree toggle, i18n), docs (daemon and app pages in three languages). Daemon and app both need the update to show Codex sessions; older apps show them as Claude Code-like sessions without the mode chip.
