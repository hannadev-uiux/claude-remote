## Context

Rótulos da linha de status (Claude Code 2.1): "manual mode on" ou nenhum rótulo (default), "accept edits on", "plan mode on", "auto mode on", "bypass permissions on", "don't ask on". O ciclo varia por versão e configuração.

## Goals / Non-Goals

**Goals:** nunca assumir a ordem do ciclo.

**Non-Goals:** `dontAsk` (não está no ciclo).

## Decisions

- **Detector puro** `detectMode(paneText)`: procura os rótulos nas últimas 6 linhas do painel; ausência de rótulo → `default`.
- **Laço de troca**: `send-keys BTab`, espera 150 ms, `capture-pane -p`, detecta; repete até alvo ou 6 tentativas. Se cair em `bypassPermissions`, envia mais um BTab imediatamente.
- **Mutex por sessão** compartilhado com a fila de entrada (change 07) para não intercalar com prompts.

## Risks / Trade-offs

- [Rótulos mudam de texto] → tabela de rótulos num único arquivo com testes.
