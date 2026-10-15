## 1. Domain types

- [x] 1.1 Create `domain.ts` with schemas for `Profile`, `Session`, `SessionState`, `PermissionMode`, `TranscriptEntry`, `PermissionRequest`, `CommandItem`, `FileItem`; verify with `pnpm --filter @claude-remote/protocol typecheck`

## 2. Messages

- [x] 2.1 Create `client.ts` with the discriminated union of client messages; verify with a parse test for each type
- [x] 2.2 Create `server.ts` with the union of server messages; verify with a parse test for each type
- [x] 2.3 Implement `parseClientMessage`/`parseServerMessage` returning a `Result` without throwing; verify with tests for invalid JSON, unknown type and extra fields
- [x] 2.4 Export `PROTOCOL_VERSION` and envelope helpers; verify with `pnpm test` in the package
