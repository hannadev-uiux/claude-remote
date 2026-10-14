## Context

Subagentes: `<configDir>/projects/<projeto>/<sessionId>/subagents/agent-<agentId>.jsonl`. `Stop` traz `background_tasks`.

## Decisions

- **Watcher** chokidar na pasta `subagents` das sessões ativas (`depth: 0`, só `add`/`change`).
- **Estado**: `running` ao ver o arquivo ou mudança; `done` no `SubagentStop` ou após 2 min sem mudanças com sessão `idle`.
- **Reuso** do leitor incremental do change 06, parametrizado pelo caminho; chave de assinatura `sessionId#agentId`.
- `agentType` lido da primeira linha do transcript do subagente quando disponível, senão do hook.

## Risks / Trade-offs

- [Formato de `background_tasks` não documentado em detalhe] → schema tolerante (`z.array(z.unknown())`) e exibição genérica.
