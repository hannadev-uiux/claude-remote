## Purpose

Permite iniciar novas sessões e retomar sessões encerradas a partir do app, sempre dentro do tmux.

## ADDED Requirements

### Requirement: Nova sessão
`session.start` SHALL abrir uma janela tmux na sessão `claude-remote` executando o launcher do perfil no `cwd` informado e responder `ack` com o painel criado. Diretório inexistente MUST gerar `error` `invalid_cwd`.

#### Scenario: Iniciar no projeto
- **WHEN** o app pede nova sessão em `drclaude` no diretório `~/workspaces/api`
- **THEN** uma janela é criada e a sessão aparece na lista após o `SessionStart`

### Requirement: Retomar sessão
`session.resume` SHALL abrir uma janela com `claude --resume <sessionId>` no `cwd` original da sessão com o perfil correto.

#### Scenario: Retomar encerrada
- **WHEN** o app toca "Retomar" numa sessão encerrada
- **THEN** a sessão volta a ficar controlável com o mesmo histórico

### Requirement: Diretórios recentes
`projects.list { profileId }` SHALL retornar os `cwd` das sessões do perfil ordenados pelo uso mais recente, até 30.

#### Scenario: Escolher diretório
- **WHEN** o usuário abre "Nova sessão"
- **THEN** vê os diretórios recentes do perfil escolhido
