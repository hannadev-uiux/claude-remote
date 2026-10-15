## Why

Long tasks use subagents and background commands; without seeing them, the user does not know what the session is doing (D14, A12).

## What Changes

- Daemon: discovery of subagents in `<project>/<sessionId>/subagents/agent-*.jsonl` and via the `SubagentStop` hook (`agent_id`, `agent_type`, `agent_transcript_path`); `subagent.updated` event.
- Daemon: background tasks from the `background_tasks` field of the `Stop` hook.
- Daemon: subscribable subagent transcript (`session.subscribe` with `agentId`).
- App: subagents nested under the parent session in the list and on the session screen; "background" badge.

## Capabilities

### New Capabilities
- `subagents`: visibility of subagents and background tasks.

### Modified Capabilities

## Impact

`features/subagents` in the daemon; `subagents`/`backgroundTasks` fields on `Session` in the protocol; app.
