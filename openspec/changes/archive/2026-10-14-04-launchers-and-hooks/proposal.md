## Why

Só sessões dentro do tmux podem receber entrada remota, e o daemon só sabe o que acontece na sessão se o Claude Code o avisar por hooks. Sem launchers e hooks instalados, nenhuma sessão é controlável.

## What Changes

- Launchers `claudin` e `drclaude` que abrem o `claude` numa janela tmux nomeada, com o `CLAUDE_CONFIG_DIR` do perfil, repassando todos os argumentos.
- Comando `claude-remote install` que instala os launchers, adiciona o diretório deles ao `PATH` no `~/.zshrc` (bloco marcado) e mescla os hooks HTTP no `settings.json` de cada perfil sem tocar no resto do arquivo.
- Comando `claude-remote uninstall` que remove apenas o que o instalador adicionou.
- Endpoint `/hooks/:event` no daemon que recebe `SessionStart`, `SessionEnd`, `Stop`, `SubagentStop`, `Notification` e `PermissionRequest`.

## Capabilities

### New Capabilities
- `launchers`: comandos que iniciam sessões controláveis dentro do tmux.
- `hooks-integration`: instalação dos hooks nos perfis e recepção dos eventos pelo daemon.

### Modified Capabilities

## Impact

Arquivos `settings.json` dos perfis, `~/.zshrc`, `~/.claude-remote/bin`. Módulo `features/hooks` no daemon.
