## Why

App e daemon conversam por WebSocket. Se as mensagens não tiverem um contrato único e validado em runtime, qualquer divergência vira bug silencioso no celular.

## What Changes

- Pacote `@claude-remote/protocol` com schemas Zod de todas as mensagens cliente → daemon e daemon → cliente descritas no PRD (seção 10).
- Envelope comum com `id` de requisição, correlação de respostas (`replyTo`) e erros tipados.
- Tipos de domínio compartilhados: perfil, sessão, estado, modo de permissão, entrada de transcript normalizada, pedido de permissão.
- Funções `parseClientMessage` / `parseServerMessage` que nunca lançam exceção.

## Capabilities

### New Capabilities
- `protocol`: contrato das mensagens WebSocket entre app e daemon e regras de validação.

### Modified Capabilities

## Impact

Novo pacote `packages/protocol`, dependência `zod`. Consumido por `apps/daemon` e `apps/mobile`.
