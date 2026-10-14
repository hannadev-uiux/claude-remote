## MODIFIED Requirements

### Requirement: Instalação idempotente dos hooks
O instalador SHALL mesclar no `settings.json` de cada perfil hooks HTTP para `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`, `SubagentStop`, `Notification` e `PermissionRequest` apontando para o daemon local, preservando todas as outras chaves e hooks do arquivo. Rodar o instalador duas vezes MUST produzir o mesmo arquivo.

#### Scenario: settings.json com hooks do usuário
- **WHEN** o perfil já tem um hook `Stop` próprio
- **THEN** o hook do usuário continua lá e o hook do daemon é adicionado ao lado

#### Scenario: Reinstalação
- **WHEN** o instalador roda pela segunda vez
- **THEN** nenhum hook é duplicado

#### Scenario: Backup
- **WHEN** o instalador altera um `settings.json`
- **THEN** uma cópia `settings.json.bak-claude-remote` é gravada antes
