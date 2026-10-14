## Purpose

Define o contrato das mensagens trocadas por WebSocket entre o app móvel e o daemon, com validação em runtime nos dois lados.

## ADDED Requirements

### Requirement: Envelope de mensagens
Toda mensagem SHALL ser um objeto JSON com campo `type` discriminante. Mensagens do cliente que esperam resposta MUST carregar `id`; respostas do daemon MUST carregar `replyTo` com esse `id`.

#### Scenario: Resposta correlacionada
- **WHEN** o cliente envia `sessions.list` com `id` "abc"
- **THEN** o daemon responde `sessions.snapshot` com `replyTo` "abc"

#### Scenario: Erro tipado
- **WHEN** uma requisição falha
- **THEN** o daemon responde `error` com `replyTo`, `code` e `message`

### Requirement: Validação tolerante
O parser SHALL rejeitar mensagens malformadas retornando um resultado de erro, sem lançar exceção, e SHALL ignorar campos desconhecidos.

#### Scenario: Mensagem inválida
- **WHEN** chega `{"type":"session.input"}` sem `sessionId`
- **THEN** o parser retorna erro de validação e o processo continua

#### Scenario: Campo extra
- **WHEN** chega uma mensagem válida com um campo a mais
- **THEN** a mensagem é aceita e o campo extra é descartado

### Requirement: Catálogo de mensagens
O protocolo SHALL definir as mensagens de cliente `auth`, `sessions.list`, `session.subscribe`, `session.unsubscribe`, `session.history`, `session.input`, `session.key`, `session.setMode`, `permission.respond`, `device.register`, `files.search`, `commands.list`, `projects.list`, `session.start`, `session.resume`, `pane.subscribe`, `pane.unsubscribe`, `settings.mute`, `app.visibility` e `ping`; e as mensagens de servidor `auth.ok`, `sessions.snapshot`, `session.updated`, `session.removed`, `transcript.entry`, `transcript.page`, `pane.frame`, `permission.request`, `permission.resolved`, `session.state`, `subagent.updated`, `files.results`, `commands.results`, `projects.results`, `ack`, `error` e `pong`.

#### Scenario: Tipo desconhecido
- **WHEN** chega uma mensagem com `type` fora do catálogo
- **THEN** o parser retorna erro `unknown_type`

### Requirement: Versão do protocolo
O handshake `auth` SHALL incluir `protocolVersion`; o daemon MUST recusar versões de major diferente com erro `protocol_mismatch`.

#### Scenario: Versão incompatível
- **WHEN** o app envia `protocolVersion` 2 e o daemon fala a 1
- **THEN** o daemon responde `error` `protocol_mismatch` e fecha a conexão
