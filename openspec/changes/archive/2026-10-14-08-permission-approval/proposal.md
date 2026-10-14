## Why

Sessões param esperando aprovação de ferramentas; sem resposta remota, a tarefa trava até o usuário voltar ao Mac (D5, D12).

## What Changes

- Hook `PermissionRequest` segura a requisição HTTP enquanto o daemon pergunta ao app; a resposta volta como `allow`/`deny`.
- `permission.request` enviado a todos os clientes conectados; `permission.respond` resolve; `permission.resolved` avisa os demais.
- "Permitir sempre" com regra sugerida (a partir de `permission_suggestions` ou gerada pelo daemon) e escopo `profile` ou `project`.
- Tempo limite: sem resposta, o hook devolve vazio e o diálogo aparece na TUI.
- Registro (audit log) das regras criadas pelo app e comando para desfazer.

## Capabilities

### New Capabilities
- `permission-approval`: intermediação de pedidos de permissão e gravação de regras "permitir sempre".

### Modified Capabilities

## Impact

Módulo `features/permissions`; rota de hook `PermissionRequest`; arquivo `~/.claude-remote/rules-log.jsonl`.
