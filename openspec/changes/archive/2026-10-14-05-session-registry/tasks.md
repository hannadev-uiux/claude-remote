## 1. Infra tmux

- [x] 1.1 Implementar `TmuxClient` (`listPanes`, `hasPane`, `capturePane`, `sendKeys`, `pasteText`, `newWindow`) sobre um executor injetável; verificar com testes dos argumentos gerados

## 2. Registro

- [x] 2.1 Implementar `SessionStore` com upsert, eventos e persistência em `state.json`; verificar com testes de upsert e restauração
- [x] 2.2 Implementar varredura de transcripts recentes com leitura da cauda (título, cwd, modo); verificar com fixtures `.jsonl`
- [x] 2.3 Adicionar `UserPromptSubmit` aos hooks instalados; verificar com teste do merge
- [x] 2.4 Ligar os hooks às transições de estado e o polling de painéis; verificar com testes de cada transição e de painel morto
- [x] 2.5 Registrar handler `sessions.list` → `sessions.snapshot` e broadcast de `session.updated`; verificar com teste de integração WS
