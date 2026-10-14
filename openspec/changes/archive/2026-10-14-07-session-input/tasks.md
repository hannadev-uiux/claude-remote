## 1. Entrada

- [x] 1.1 Implementar `InputService.sendText` com buffer nomeado, bracketed paste, espera e Enter, mais fila por sessão; verificar com teste dos comandos tmux gerados e da ordem
- [x] 1.2 Implementar `sendKey` com lista permitida; verificar com testes de tecla válida e inválida
- [x] 1.3 Registrar handlers `session.input` e `session.key` com checagens `not_controllable` e `too_large`; verificar com teste WS
- [x] 1.4 Validar manualmente contra uma sessão real no tmux com prompt de várias linhas e `@`; registrar resultado no `tasks.md`

> Validação 1.4 (2026-10-14): TUI de teste com bracketed paste habilitado num tmux isolado recebeu
> `ESC[200~linha 1\rlinha 2 @src/a.ts /model ESC[201~` seguido de `\r` (Enter); `Escape` e `BTab` (`ESC[Z`)
> chegaram corretamente. A validação contra a TUI do Claude Code fica para o primeiro uso real.
