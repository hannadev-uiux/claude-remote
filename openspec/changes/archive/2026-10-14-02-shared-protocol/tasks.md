## 1. Tipos de domínio

- [x] 1.1 Criar `domain.ts` com schemas de `Profile`, `Session`, `SessionState`, `PermissionMode`, `TranscriptEntry`, `PermissionRequest`, `CommandItem`, `FileItem`; verificar com `pnpm --filter @claude-remote/protocol typecheck`

## 2. Mensagens

- [x] 2.1 Criar `client.ts` com a união discriminada das mensagens do cliente; verificar com teste de parse de cada tipo
- [x] 2.2 Criar `server.ts` com a união das mensagens do servidor; verificar com teste de parse de cada tipo
- [x] 2.3 Implementar `parseClientMessage`/`parseServerMessage` que retornam `Result` sem lançar; verificar com testes de JSON inválido, tipo desconhecido e campos extras
- [x] 2.4 Exportar `PROTOCOL_VERSION` e helpers de envelope; verificar com `pnpm test` no pacote
