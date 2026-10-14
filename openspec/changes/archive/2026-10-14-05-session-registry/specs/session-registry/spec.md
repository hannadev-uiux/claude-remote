## Purpose

Mantém a lista unificada de sessões do Claude Code de todos os perfis, com estado e possibilidade de controle.

## ADDED Requirements

### Requirement: Listagem unificada
O daemon SHALL responder `sessions.list` com todas as sessões ativas (vinculadas a painel tmux vivo) e as recentes (transcripts modificados nos últimos 7 dias) de todos os perfis, cada uma com `id`, `profileId`, `cwd`, `title`, `state`, `permissionMode`, `controllable`, `updatedAt`.

#### Scenario: Dois perfis
- **WHEN** existe uma sessão ativa em `claudin` e outra em `drclaude`
- **THEN** o snapshot contém as duas, cada uma com seu `profileId`

#### Scenario: Sessão só em disco
- **WHEN** um transcript recente não tem painel tmux vinculado
- **THEN** a sessão aparece com `controllable: false` e estado `ended`

### Requirement: Estado por eventos
O daemon SHALL atualizar o estado da sessão a partir dos hooks: `SessionStart` → `idle`; `UserPromptSubmit` → `running`; `Stop` → `idle`; `Notification`/`PermissionRequest` → `waiting`; `SessionEnd` → `ended`. Cada mudança MUST ser enviada aos clientes como `session.updated`.

#### Scenario: Pedido de permissão
- **WHEN** chega um `Notification` do tipo `permission_prompt`
- **THEN** a sessão passa a `waiting` e os clientes recebem `session.updated`

### Requirement: Painel morto
O daemon SHALL verificar periodicamente (a cada 5 s) se os painéis vinculados existem e MUST marcar como `ended` e `controllable: false` as sessões cujo painel sumiu.

#### Scenario: Janela tmux fechada
- **WHEN** o usuário fecha a janela da sessão no Mac
- **THEN** em até 5 s a sessão aparece como encerrada no app

### Requirement: Persistência do vínculo
O vínculo sessão ↔ painel ↔ perfil SHALL ser persistido e restaurado no início do daemon, descartando painéis que não existem mais.

#### Scenario: Reinício do daemon
- **WHEN** o daemon reinicia com uma sessão ainda aberta no tmux
- **THEN** a sessão volta a aparecer como controlável
