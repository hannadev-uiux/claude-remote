## Purpose

Conecta as sessões do Claude Code ao daemon por meio de hooks HTTP instalados em cada perfil.

## ADDED Requirements

### Requirement: Instalação idempotente dos hooks
O instalador SHALL mesclar no `settings.json` de cada perfil hooks HTTP para `SessionStart`, `SessionEnd`, `Stop`, `SubagentStop`, `Notification` e `PermissionRequest` apontando para o daemon local, preservando todas as outras chaves e hooks do arquivo. Rodar o instalador duas vezes MUST produzir o mesmo arquivo.

#### Scenario: settings.json com hooks do usuário
- **WHEN** o perfil já tem um hook `Stop` próprio
- **THEN** o hook do usuário continua lá e o hook do daemon é adicionado ao lado

#### Scenario: Reinstalação
- **WHEN** o instalador roda pela segunda vez
- **THEN** nenhum hook é duplicado

#### Scenario: Backup
- **WHEN** o instalador altera um `settings.json`
- **THEN** uma cópia `settings.json.bak-claude-remote` é gravada antes

### Requirement: Desinstalação
O `uninstall` SHALL remover apenas os hooks, o bloco do `~/.zshrc` e os launchers criados pelo instalador.

#### Scenario: Remoção limpa
- **WHEN** o usuário roda `uninstall`
- **THEN** o `settings.json` volta a ter só os hooks do usuário

### Requirement: Recepção de eventos
O daemon SHALL aceitar `POST /hooks/<evento>` com o payload do Claude Code, identificar o perfil e o painel tmux pelos headers enviados pelo hook, e publicar o evento internamente. Eventos que não sejam de permissão MUST ser respondidos imediatamente com corpo vazio, sem bloquear a sessão.

#### Scenario: SessionStart de sessão do launcher
- **WHEN** chega `SessionStart` com header de painel `%12` e perfil `claudin`
- **THEN** o daemon associa o `session_id` ao painel `%12` e ao perfil `claudin`

#### Scenario: Daemon fora do ar
- **WHEN** o Claude Code dispara um hook e o daemon não está rodando
- **THEN** a sessão do Claude segue normalmente (o hook falha sem bloquear)
