## Context

Subagents: `<configDir>/projects/<project>/<sessionId>/subagents/agent-<agentId>.jsonl`. `Stop` carries `background_tasks`.

## Decisions

- **Watcher**: chokidar on the `subagents` folder of active sessions (`depth: 0`, only `add`/`change`).
- **State**: `running` when the file appears or changes; `done` on `SubagentStop` or after 2 min without changes while the session is `idle`.
- **Reuse** of the incremental reader from change 06, parameterized by path; subscription key `sessionId#agentId`.
- `agentType` read from the first line of the subagent transcript when available, otherwise from the hook.

## Risks / Trade-offs

- [`background_tasks` format not documented in detail] → tolerant schema (`z.array(z.unknown())`) and generic display.
