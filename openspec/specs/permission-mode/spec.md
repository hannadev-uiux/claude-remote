# permission-mode Specification

## Purpose
Permite ler e alterar remotamente o modo de permissão de uma sessão ativa, sempre exibindo o modo confirmado.

## Requirements

### Requirement: Leitura do modo
O daemon SHALL identificar o modo atual (`default`, `acceptEdits`, `plan`, `auto`, `bypassPermissions`, `dontAsk`) pela linha de status do painel e manter o campo `permissionMode` da sessão atualizado.

#### Scenario: Modo plano
- **WHEN** a linha de status mostra "plan mode on"
- **THEN** a sessão tem `permissionMode: "plan"`

### Requirement: Troca confirmada
`session.setMode` SHALL enviar Shift+Tab e reler o modo após cada tecla até alcançar o alvo; se o alvo não aparecer após um ciclo completo (máx. 6 teclas), MUST responder `error` `mode_unreachable` com o modo em que parou.

#### Scenario: Ir para aceitar edições
- **WHEN** a sessão está em `default` e o app pede `acceptEdits`
- **THEN** o daemon envia Shift+Tab, confirma "accept edits on" e responde `ack` com `permissionMode: "acceptEdits"`

#### Scenario: Modo indisponível
- **WHEN** o app pede `auto` num perfil sem modo auto no ciclo
- **THEN** recebe `error` `mode_unreachable` e o modo atual real

### Requirement: Bypass proibido
O daemon MUST recusar `bypassPermissions` com `error` `mode_forbidden`, e MUST parar o ciclo se passar por ele, seguindo para o próximo.

#### Scenario: Pedido de bypass
- **WHEN** o app pede `bypassPermissions`
- **THEN** recebe `mode_forbidden` e nenhuma tecla é enviada

### Requirement: Sessão ocupada
A troca SHALL ser recusada com `session_busy` se houver pedido de permissão pendente na sessão.

#### Scenario: Diálogo aberto
- **WHEN** existe um `permission.request` pendente
- **THEN** `session.setMode` recebe `session_busy`
