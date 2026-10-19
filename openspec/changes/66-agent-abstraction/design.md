## Context

Profiles are `{ id, name, configDir, color }`; `LifecycleService` launches `<bin>/<profile id>` with `--resume <id>` or `--worktree <name>`; `scanRecentTranscripts` reads `<configDir>/projects/**/*.jsonl`; session records are created from hooks and from that scan. The app's `sessionAgent` / `profileAgent` return `claude` as placeholders (changes 52, 61). The launcher script, the hooks installer and the transcript parser are Claude Code specific and stay so in this change.

## Decisions

- **Optional fields, Claude Code by default.** `agent` is optional on `Profile` and `Session`: configs, state files, daemons and apps written before this change keep parsing, and every consumer reads it through `profileAgentId(profile)` / `sessionAgent(session)`, which default to `claude`. No fixture in the repo has to change.
- **One adapter per CLI, data first.** `AgentAdapter` holds what differs between CLIs today: the command, the config dir variable and default, the resume and worktree args, the transcripts dir under the config dir. The Claude Code adapter reproduces the current values byte for byte; `agentFor(profile)` picks it. Behaviour that still needs research for Codex (hooks, approvals, parser) is not modelled yet, so the interface does not promise it.
- **Unknown adapters are refused early, not at launch.** `resolveProfiles` drops a profile whose agent has no adapter with a warning, the same way it drops a missing config dir, so the rest of the daemon never meets a profile it cannot run. `codex`, `kimi` and `qwen` are valid ids in the protocol (the app already has their colors) but have no adapter until their changes land.
- **The registry carries the agent.** `SessionService` stamps `agent` from the session's profile when it creates a record (hook or recent scan), so the app's badge, the agents count and the placeholder no longer guess.
- **Launcher and hooks stay as they are.** They are correct for Claude Code and the only adapter; moving them behind the interface without a second implementation would be speculative. The adapter exposes `configDirEnv` and `command` so that step can follow #108's research.
