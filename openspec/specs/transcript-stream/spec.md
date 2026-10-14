# transcript-stream Specification

## Purpose
Entrega ao app o conteúdo das sessões em tempo real, com histórico paginado e retomada sem perdas.

## Requirements

### Requirement: Normalização tolerante
O daemon SHALL converter cada linha do transcript em zero ou mais entradas normalizadas (`user`, `assistant_text`, `thinking`, `tool_use`, `tool_result`, `system`, `unknown`). Linhas inválidas ou de tipo desconhecido MUST NOT interromper a leitura.

#### Scenario: Linha corrompida
- **WHEN** uma linha do `.jsonl` não é JSON válido
- **THEN** ela é ignorada e as seguintes continuam sendo transmitidas

#### Scenario: Tipos internos
- **WHEN** a linha é `file-history-snapshot`, `atis-latch` ou `queue-operation`
- **THEN** nenhuma entrada é enviada ao app

#### Scenario: Pensamento vazio
- **WHEN** um bloco `thinking` vem sem texto
- **THEN** nenhuma entrada é enviada para ele

### Requirement: Transmissão em tempo real
Após `session.subscribe`, o daemon SHALL enviar cada nova entrada como `transcript.entry` com `cursor` crescente em menos de 1 s após ser gravada no arquivo.

#### Scenario: Nova resposta
- **WHEN** o Claude grava uma resposta no transcript de uma sessão assinada
- **THEN** o app recebe `transcript.entry` correspondente

### Requirement: Retomada por cursor
Com `sinceCursor`, o daemon SHALL enviar todas as entradas posteriores ao cursor antes das novas; sem `sinceCursor`, MUST enviar a última página (50 entradas).

#### Scenario: Reconexão
- **WHEN** o app reconecta e assina com `sinceCursor` 120
- **THEN** recebe as entradas a partir do cursor 121, sem duplicatas

### Requirement: Histórico paginado
`session.history { before, limit }` SHALL retornar `transcript.page` com até `limit` (máx. 200) entradas anteriores a `before` e `hasMore`.

#### Scenario: Rolagem para cima
- **WHEN** o app pede `before` 50 e `limit` 50
- **THEN** recebe as entradas de cursor 0 a 49 e `hasMore: false`
