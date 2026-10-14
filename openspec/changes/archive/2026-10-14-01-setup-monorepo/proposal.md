## Why

O Claude Remote tem três partes que precisam compartilhar tipos (app, daemon e protocolo). Sem um monorepo com tooling comum, cada parte divergiria em versão de TypeScript, lint e testes, e o protocolo WebSocket quebraria silenciosamente.

## What Changes

- Monorepo pnpm workspaces + Turborepo com `apps/daemon`, `apps/mobile` e `packages/protocol`.
- `tsconfig.base.json` estrito compartilhado (TypeScript `strict`, `noUncheckedIndexedAccess`).
- Biome para lint e formatação; Vitest para testes; scripts `typecheck`, `lint`, `test`, `build` orquestrados pelo Turborepo.
- `.gitignore`, `.editorconfig`, `.nvmrc` e README inicial.

## Capabilities

### New Capabilities
<!-- Nenhuma: mudança só de tooling (skip_specs: true). -->

### Modified Capabilities
<!-- Nenhuma. -->

## Impact

Cria a estrutura de diretórios e as dependências de desenvolvimento usadas por todos os changes seguintes.
