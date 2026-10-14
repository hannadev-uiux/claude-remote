## Purpose

Permite aprovar ou negar pelo celular os pedidos de permissão das sessões, inclusive criando regras de "permitir sempre".

## ADDED Requirements

### Requirement: Intermediação do pedido
Ao receber `PermissionRequest`, o daemon SHALL criar um pedido com `requestId`, enviar `permission.request { requestId, sessionId, tool, input, suggestedRule, expiresAt }` aos clientes e manter a requisição do hook aberta até a resposta ou o tempo limite.

#### Scenario: Aprovação
- **WHEN** o app responde `permission.respond` com `allow`
- **THEN** o hook recebe `{"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":{"behavior":"allow"}}}` e a ferramenta executa

#### Scenario: Negação
- **WHEN** o app responde `deny`
- **THEN** o hook recebe `behavior: "deny"` com mensagem "Negado pelo Claude Remote"

### Requirement: Tempo limite sem decisão
Se nenhuma resposta chegar antes do limite configurado (menor que o timeout do hook), o daemon SHALL responder ao hook sem decisão, e o pedido MUST ser marcado como expirado para os clientes.

#### Scenario: Celular não responde
- **WHEN** o tempo limite expira
- **THEN** o diálogo de permissão aparece normalmente na TUI do Mac e o app recebe `permission.resolved` com `expired`

### Requirement: Resposta única
Apenas a primeira resposta para um `requestId` SHALL valer; as seguintes MUST receber `error` `already_resolved`.

#### Scenario: Duas respostas
- **WHEN** o app responde duas vezes o mesmo pedido
- **THEN** a segunda recebe `already_resolved`

### Requirement: Permitir sempre
Com `always { rule, scope }`, o daemon SHALL aprovar o pedido e persistir a regra em `permissions.allow`: escopo `profile` no `settings.json` do perfil; escopo `project` no `.claude/settings.local.json` do `cwd` da sessão. O restante do arquivo MUST ser preservado e a regra registrada no log do daemon.

#### Scenario: Regra de projeto
- **WHEN** o app aprova com `always { rule: "Bash(pnpm test:*)", scope: "project" }`
- **THEN** `.claude/settings.local.json` do projeto passa a conter a regra e o próximo `pnpm test` não pede permissão

#### Scenario: Desfazer
- **WHEN** o usuário roda `claude-remote rules undo <id>`
- **THEN** a regra é removida do arquivo em que foi gravada

### Requirement: Pedido encerrado pela TUI
Se a sessão continuar sem a resposta do app (respondida no Mac), o pedido SHALL ser marcado como resolvido para os clientes.

#### Scenario: Aprovado no Mac
- **WHEN** a requisição do hook é cancelada pelo Claude Code
- **THEN** os clientes recebem `permission.resolved` com `cancelled`
