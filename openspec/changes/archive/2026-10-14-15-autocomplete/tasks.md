## 1. Daemon

- [x] 1.1 Implementar índice de arquivos (git/rg) com pastas, cache e busca fuzzy; verificar com teste em repositório git temporário
- [x] 1.2 Implementar leitura de skills/comandos (perfil, projeto, plugins), lista nativa e cache invalidado por mtime; verificar com teste em diretórios temporários
- [x] 1.3 Registrar `files.search` e `commands.list`; verificar com teste WS

## 2. App

- [x] 2.1 Implementar detecção do token `@`/`/` sob o cursor e inserção da sugestão; verificar com testes unitários
- [x] 2.2 Criar `SuggestionList` integrada ao `PromptComposer` com TanStack Query e debounce; verificar com typecheck
- [x] 2.3 Abrir terminal bruto ao enviar comandos interativos; verificar com teste da regra
