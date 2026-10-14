## Why

Tarefas longas usam subagentes e comandos em background; sem vê-los, o usuário não sabe o que a sessão está fazendo (D14, A12).

## What Changes

- Daemon: descoberta de subagentes em `<projeto>/<sessionId>/subagents/agent-*.jsonl` e via hook `SubagentStop` (`agent_id`, `agent_type`, `agent_transcript_path`); evento `subagent.updated`.
- Daemon: tarefas em background a partir do campo `background_tasks` do hook `Stop`.
- Daemon: transcript de subagente assinável (`session.subscribe` com `agentId`).
- App: subagentes aninhados sob a sessão pai na lista e na tela da sessão; selo "background".

## Capabilities

### New Capabilities
- `subagents`: visibilidade de subagentes e tarefas em background.

### Modified Capabilities

## Impact

`features/subagents` no daemon; campos `subagents`/`backgroundTasks` em `Session` no protocolo; app.
