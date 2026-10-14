## Context

O Claude Code entende bracketed paste; `tmux paste-buffer -p` emite as sequências de bracketed paste quando a aplicação as habilitou.

## Goals / Non-Goals

**Goals:** latência < 300 ms do toque ao painel.

**Non-Goals:** detectar se a TUI está num diálogo (o app mostra o terminal bruto para isso, change 16).

## Decisions

- **Buffer nomeado por sessão** (`-b cr-<sessionId>`) via `load-buffer -` lendo de stdin (evita escapar o texto na linha de comando), `paste-buffer -p -d -b ... -t <pane>`, pequena espera (80 ms) e `send-keys Enter`. A espera dá tempo da TUI processar o fim do paste antes do Enter.
- **Fila por sessão** (promessa encadeada) para que entradas consecutivas não se intercalem.
- **Lista permitida de teclas** no módulo (`ALLOWED_KEYS`).
- **Fallback** (risco do PRD): opção de configuração `inputStrategy: "paste" | "type"`; no modo `type` usa `send-keys -l` + `Escape` antes do Enter.

## Risks / Trade-offs

- [Enter chega antes do fim do paste] → espera configurável (`pasteEnterDelayMs`).
