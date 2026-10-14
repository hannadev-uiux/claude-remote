## Why

Ver a conversa em tempo real é a função central do app (D3). O `.jsonl` é formato interno do Claude Code e pode mudar; o parser precisa ser isolado e tolerante.

## What Changes

- Parser isolado que converte linhas do `.jsonl` em `TranscriptEntry` normalizadas, ignorando tipos internos (snapshots, latch, fila) e marcando desconhecidos como `unknown`.
- Tail com `chokidar` por sessão assinada, transmitindo `transcript.entry` com `cursor`.
- Histórico paginado (`session.history { before, limit }` → `transcript.page`).
- Retomada: `session.subscribe { sinceCursor }` reenvia as entradas perdidas.

## Capabilities

### New Capabilities
- `transcript-stream`: leitura, normalização e transmissão do transcript das sessões.

### Modified Capabilities

## Impact

Módulo `features/transcript` no daemon; dependência `chokidar`.
