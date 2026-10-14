# launchers Specification

## Purpose
Fornece comandos que iniciam o Claude Code dentro do tmux, com o perfil correto, para que a sessão possa ser controlada pelo celular.

## Requirements

### Requirement: Abrir sessão no tmux
O launcher SHALL criar (se não existir) a sessão tmux `claude-remote` e abrir nela uma nova janela nomeada `<perfil>:<diretório>` executando `claude` com `CLAUDE_CONFIG_DIR` do perfil e `CLAUDE_REMOTE_PROFILE` definidos, repassando todos os argumentos recebidos.

#### Scenario: Fora do tmux
- **WHEN** o usuário roda `claudin --resume` num terminal fora do tmux
- **THEN** uma janela é criada na sessão `claude-remote` com `claude --resume` e o terminal se anexa a ela

#### Scenario: Dentro do tmux
- **WHEN** o usuário roda `drclaude` dentro de outra sessão tmux
- **THEN** a janela é criada na sessão `claude-remote` e o cliente atual alterna para ela

### Requirement: claude puro intacto
A instalação MUST NOT alterar o comando `claude`.

#### Scenario: claude fora do launcher
- **WHEN** o usuário roda `claude` diretamente
- **THEN** a sessão abre normalmente fora do tmux
