## 1. Launchers

- [x] 1.1 Criar template zsh do launcher e gerador por perfil; verificar com teste do conteúdo gerado e `zsh -n` no script
- [x] 1.2 Implementar instalação dos launchers em `~/.claude-remote/bin` e bloco marcado no `~/.zshrc`; verificar com teste em diretório temporário

## 2. Hooks

- [x] 2.1 Implementar merge/remoção idempotente dos hooks HTTP no `settings.json` com backup e escrita atômica; verificar com testes de reinstalação, hooks do usuário e uninstall
- [x] 2.2 Implementar rota `POST /hooks/:event` com schemas Zod dos payloads e publicação no event bus; verificar com teste `inject` de cada evento
- [x] 2.3 Adicionar comandos `install` e `uninstall` à CLI; verificar rodando contra um `CLAUDE_CONFIG_DIR` temporário
