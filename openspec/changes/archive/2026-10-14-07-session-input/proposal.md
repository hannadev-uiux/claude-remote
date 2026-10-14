## Why

Mandar prompts e destravar a TUI pelo celular é o segundo pilar do app (D4). Digitar tecla a tecla aciona o autocomplete da TUI e quebra prompts com várias linhas.

## What Changes

- `session.input { sessionId, text }`: cola o texto inteiro com `tmux load-buffer` + `paste-buffer -p` (bracketed paste) e só então envia Enter.
- `session.key { sessionId, key }`: teclas especiais por `send-keys` (`Enter`, `Escape`, `Up`, `Down`, `Left`, `Right`, `Tab`, `BTab`, `C-c`, `C-d`, números 1-9 para menus).
- Verificação prévia: recusa entrada em sessão não controlável.
- `ack` em caso de sucesso, `error` com código em caso de falha.

## Capabilities

### New Capabilities
- `session-input`: envio de texto e teclas para sessões controláveis.

### Modified Capabilities

## Impact

Módulo `features/input` no daemon, usando `TmuxClient`.
