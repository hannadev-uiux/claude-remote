# app-permissions Specification

## Purpose
Permite responder pedidos de permissão e trocar o modo de permissão de uma sessão diretamente no app.

## Requirements

### Requirement: Cartão de permissão
Para cada `permission.request` pendente, o app SHALL mostrar um cartão na sessão com a ferramenta, o detalhe da entrada (comando, caminho ou JSON) e o tempo restante, com as ações Permitir, Permitir sempre e Negar.

#### Scenario: Pedido de Bash
- **WHEN** chega pedido de `Bash` com `rm -rf dist`
- **THEN** o cartão mostra o comando completo e as três ações

#### Scenario: Resolvido em outro lugar
- **WHEN** chega `permission.resolved` para o pedido
- **THEN** o cartão some e um aviso discreto indica o resultado

### Requirement: Confirmação do permitir sempre
"Permitir sempre" SHALL abrir uma confirmação com a regra exata (editável) e o escopo (perfil ou projeto, padrão vindo do daemon) antes de enviar.

#### Scenario: Confirmar regra
- **WHEN** o usuário escolhe escopo "projeto" e confirma `Bash(pnpm test:*)`
- **THEN** o app envia `permission.respond` com `always { rule, scope: "project" }`

### Requirement: Seletor de modo
O cabeçalho da sessão SHALL mostrar o modo confirmado e permitir escolher `default`, `acceptEdits`, `plan` ou `auto`; `bypassPermissions` MUST NOT ser oferecido. Escolher `auto` MUST exigir confirmação explícita.

#### Scenario: Modo auto
- **WHEN** o usuário escolhe "auto"
- **THEN** um alerta pede confirmação antes de enviar `session.setMode`

#### Scenario: Modo inalcançável
- **WHEN** o daemon responde `mode_unreachable`
- **THEN** o app mostra o erro e o modo real retornado
