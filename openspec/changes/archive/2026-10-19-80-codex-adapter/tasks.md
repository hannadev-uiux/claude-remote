## 1. Protocol

- [x] 1.1 `approvalPolicy` (nullable, default null) on `SessionSchema`, with a test

## 2. Transcript formats

- [x] 2.1 `TranscriptFormat` injected into `TranscriptFile` / `StreamTarget`; Claude Code parser as `claudeTranscript` (behavior unchanged)
- [x] 2.2 `codex-format.ts`: paginated and legacy rollouts → entries, `parseMeta` (approval policy), `findImage`, with fixture tests

## 3. Codex adapter

- [x] 3.1 `AgentAdapter` grows (transcript, findTranscripts, readSummary, commands, input, hooks style/file, status line, providers); Claude Code adapter keeps its behavior
- [x] 3.2 Codex adapter: command, `CODEX_HOME`, resume args, rollout discovery, meta (session_index, first prompt, cwd, policy), built-in commands
- [x] 3.3 Sessions (recent scan, restore, hook titles, `approvalPolicy` from transcript meta), transcript feature (format per session), autocomplete and input per adapter; `session.setMode` refused for Codex

## 4. Hooks, launcher, permissions

- [x] 4.1 Codex hooks in `hooks.json` (merge/remove, permission hook prints the answer, SessionEnd timeout) and installer/uninstaller per agent; status line only for Claude Code
- [x] 4.2 Launcher per agent (`CODEX_HOME`, `codex`, no provider block); `codex` reserved alias
- [x] 4.3 Broker: no suggested rule and no rules/mode in answers for Codex sessions

## 5. Setup and doctor

- [x] 5.1 Detect `~/.codex` in setup and suggest a Codex profile
- [x] 5.2 Doctor: `codex` on the PATH and Codex hooks; trust note in setup and doctor (three languages)

## 6. App

- [x] 6.1 Codex mode chip (approval policy, read-only) and labels
- [x] 6.2 `exec` / `apply_patch` summaries, input fields and patch diff
- [x] 6.3 Worktree toggle hidden for Codex profiles

## 7. Docs and verification

- [x] 7.1 Docs: Codex profiles in the daemon and app pages (pt-BR, en-US, es-ES)
- [x] 7.2 `pnpm check` green and `npx expo export --platform ios` bundles; still to try against a real Codex CLI (hook trust, paste timing, rollout parsing of a live session)
