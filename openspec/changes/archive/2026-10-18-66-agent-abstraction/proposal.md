# 66 · Agent abstraction: `agent` on profiles and sessions, adapters in the daemon

## Why

Everything that launches, resumes and discovers sessions is written for Claude Code: the launcher args (`--resume`, `--worktree`), the config dir variable, the `projects/*.jsonl` transcript layout. #108 asks for Codex CLI (and later other agents) behind the same app, and its suggested first step is the abstraction alone: the protocol says which agent a profile and a session belong to, the daemon routes the agent-specific bits through one adapter per CLI, and Claude Code behaves exactly as before. The app already draws the agent badge and names the agent from `sessionAgent` / `profileAgent`, which this change turns from constants into real data.

## What Changes

- **Protocol**: `AgentIdSchema` (`claude`, `codex`, `kimi`, `qwen`); `Profile.agent` and `Session.agent`, both optional with `claude` as the meaning of absence, so older daemons and apps interoperate.
- **Daemon** `features/agents/`: an `AgentAdapter` (command, config dir variable and default, resume and worktree args, transcripts dir under the config dir) and the Claude Code adapter; `agentFor(profile)` and `profileAgentId(profile)`. The lifecycle service builds resume and worktree args through the adapter, the recent-transcript scanner reads the adapter's transcripts dir, and session records carry the agent of their profile. A profile whose agent has no adapter yet is ignored at start with a warning, like a profile whose config dir is missing.
- **App**: `sessionAgent(session)` and `profileAgent(profile)` read the field (Claude Code when absent); the agents count in the machine line, the badges and the placeholder follow.
- Claude Code behaviour is unchanged (launcher, hooks, parser untouched); the Codex adapter itself (transcript format, lifecycle, approvals) stays on #108.

## Impact

- `packages/protocol/src/domain.ts` and tests.
- `apps/daemon/src/features/agents/{types,claude,index}.ts`, `features/lifecycle/service.ts`, `features/sessions/{service,recent-scan}.ts`, `core/config.ts`, `test/agents.test.ts`.
- `apps/mobile/src/features/sessions/agent.ts`, `features/lifecycle/new-session.ts` and their tests.
- Specs: `daemon-config` (MODIFIED Configurable profiles), `session-registry` (ADDED Session agent).
