## Context

Observado no Claude Code 2.1.x: cada bloco de conteúdo de uma mensagem do assistente vira uma linha separada com o mesmo `message.id`; `tool_result` vem em linhas `user`; existem linhas `system` (`turn_duration`), `attachment`, `permission-mode`, `custom-title`.

## Goals / Non-Goals

**Goals:** parser puro e 100% testado com fixtures reais anonimizadas.

**Non-Goals:** renderização (app), subagentes (change 18).

## Decisions

- **Cursor = índice da linha** (0-based). Uma linha pode gerar várias entradas; cada entrada leva `cursor` da linha e `index` dentro dela; o app deduplica por `uuid + index`.
- **Leitura incremental por offset de bytes**: guarda `byteOffset` por arquivo; ao mudar, lê do offset até o fim e só processa linhas completas (buffer da linha parcial).
- **Índice de linhas em memória** (offsets) por sessão assinada para paginação sem reler tudo; construído na primeira assinatura com stream.
- **`chokidar` com `awaitWriteFinish` desligado** e `usePolling: false` (FSEvents no macOS) para latência baixa.
- **`tool_result`** truncado em 20 KB por entrada (com flag `truncated`), evitando mensagens WS gigantes.
- Linhas `permission-mode` e `custom-title` não viram entradas, mas atualizam a sessão no registro.

## Risks / Trade-offs

- [Formato muda] → testes com fixtures; tipo `unknown` exibido como bloco cinza no app com o JSON bruto recolhido.
