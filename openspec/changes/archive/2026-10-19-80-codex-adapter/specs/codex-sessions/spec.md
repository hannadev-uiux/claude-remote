## ADDED Requirements

### Requirement: Codex profiles
A profile with `agent: "codex"` SHALL run OpenAI Codex CLI: its `configDir` is the Codex home (`CODEX_HOME`, `~/.codex` by default), its launcher opens `codex` in the shared tmux session with `CODEX_HOME` set (unset for `~/.codex`) and without any provider setup, resuming runs `codex resume <id>`, and starting in a worktree MUST be refused. The daemon MUST keep Codex profiles (they have an adapter) and Claude Code profiles MUST behave as before. `codex` MUST be a reserved profile alias.

#### Scenario: Launcher
- **WHEN** `remote-harness install` runs with a Codex profile `cdx` whose `configDir` is `~/.codex-work`
- **THEN** `~/.claude-remote/bin/cdx` exports `CODEX_HOME=~/.codex-work` and opens `codex` in a new tmux window

#### Scenario: Resume
- **WHEN** the app resumes Codex session `0199fd2a-…`
- **THEN** the launcher runs `codex resume 0199fd2a-…` in the session's folder

#### Scenario: No worktree
- **WHEN** the app starts a Codex session with the worktree option
- **THEN** the daemon answers `bad_request`

### Requirement: Codex sessions in the list
The daemon SHALL list Codex rollouts modified within `recentDays` (`<CODEX_HOME>/sessions/YYYY/MM/DD/rollout-*-<uuid>.jsonl`, the uuid being the session id) as read-only sessions with the profile's agent, the rollout's `cwd`, a title from the thread name in `session_index.jsonl`, else the first prompt, else the folder name, and the latest approval policy. Codex hook events SHALL create and update sessions like Claude Code's: `SessionStart` links the session to its tmux pane (controllable), `UserPromptSubmit` sets `running` (and the title when it is still the folder name), `PermissionRequest` sets `waiting`, `Stop` sets `idle` and pushes "done", `SessionEnd` ends it.

#### Scenario: Recent rollout
- **WHEN** `~/.codex/sessions/2026/10/19/rollout-2026-10-19T14-37-08-0199fd2a-7c1e-7a33-9a0e-5b0f2c1d4e6f.jsonl` was written today with the first prompt "run the tests"
- **THEN** the list has session `0199fd2a-7c1e-7a33-9a0e-5b0f2c1d4e6f`, agent `codex`, title "run the tests", read-only

#### Scenario: Live session
- **WHEN** a Codex session launched by a profile launcher starts in tmux pane `%7`
- **THEN** its `SessionStart` hook makes it controllable on pane `%7`

### Requirement: Codex transcript
The conversation of a Codex session SHALL be read from its rollout, paginated or legacy, as normalized entries: prompts (with their data-URL images), replies, reasoning summaries, plans, `exec` tool calls (`command`, `workdir`) and `apply_patch` tool calls (`files`, `patch`) with their results, other tool calls by name, turn durations, interruptions and compactions. Injected context (environment, instructions) MUST NOT appear as prompts and no message MUST appear twice. Only the Codex format module MAY know the rollout format; unknown lines MUST NOT break the stream.

#### Scenario: Paginated turn
- **WHEN** a paginated rollout has a user message "run the tests", an `exec_command` call `pnpm test` with output "ok" (exit 0), the reply "All tests pass." and `task_complete` with `duration_ms` 16050
- **THEN** the app shows the prompt, `exec(pnpm test)` with result "ok", the reply and "Turn completed in 16s", each once

#### Scenario: Failed command
- **WHEN** an exec output says `Process exited with code 1`
- **THEN** its result is marked as an error

### Requirement: Codex hooks installation
For Codex profiles, `install` and `setup` SHALL merge command hooks for `SessionStart`, `UserPromptSubmit`, `PermissionRequest`, `Stop` and `SessionEnd` into `<CODEX_HOME>/hooks.json`, posting the event to the daemon with the hook secret, the tmux pane and the profile; read → merge → backup → atomic write, idempotent, never touching the user's own hooks, and removed by `uninstall` or when the profile leaves the config. Setup and doctor MUST tell the user that Codex asks to trust new hooks once ("Hooks need review" → trust), and doctor SHALL report whether the hooks are installed and whether `codex` is on the PATH.

#### Scenario: Idempotent install
- **WHEN** `remote-harness install` runs twice for a Codex profile whose `hooks.json` has a user hook
- **THEN** the file has the user hook and one Remote Harness group per event, and the second run changes nothing

### Requirement: Codex permission requests
A Codex `PermissionRequest` hook SHALL be held open and offered on the phone like Claude Code's, with Allow and Deny only: no suggested rule, and the answer MUST never carry rules or a mode change. Allow answers that request only. When the phone does not answer in time the hook MUST return no decision, so Codex shows its own prompt in the terminal.

#### Scenario: Allow from the phone
- **WHEN** Codex asks to run `rm -rf build` and the user taps Allow
- **THEN** the hook answers `{"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":{"behavior":"allow"}}}`

#### Scenario: No Always
- **WHEN** a Codex permission request reaches the app
- **THEN** it has no suggested rule and the Always action is not offered

### Requirement: Codex input
Prompts SHALL be pasted into a Codex pane as one bracketed paste and submitted with Enter at least 250 ms later, so Codex does not take the Enter as part of the paste. With the `type` strategy, line breaks SHALL be sent as `C-j`. Built-in Codex slash commands SHALL be offered for Codex sessions, with `/model`, `/permissions`, `/resume` and the other menus marked interactive. Changing the mode of a Codex session from the app MUST be refused with `bad_request`.

#### Scenario: Submit after paste
- **WHEN** the app sends "continue" to a Codex session with `pasteEnterDelayMs` 80
- **THEN** the daemon pastes the text and presses Enter 250 ms later

### Requirement: Codex setup detection
`remote-harness setup` SHALL offer `~/.codex` as an account when it exists and holds `config.toml`, `auth.json` or `sessions`, suggesting a Codex profile (`agent: codex`, alias `cdx`, name `Codex`, the Codex color).

#### Scenario: Detected
- **WHEN** setup runs on a machine with `~/.claude` and `~/.codex/config.toml`
- **THEN** the account list shows `~/.claude` and `~/.codex`, the latter as `Codex · cdx`
