## Context

Projeto novo, sem código. Node 24 e pnpm 12 instalados na máquina.

## Goals / Non-Goals

**Goals:** um único comando (`pnpm check`) roda typecheck, lint e testes em todos os pacotes.

**Non-Goals:** CI remoto, publicação de pacotes.

## Decisions

- **pnpm workspaces + Turborepo**: cache de tarefas e grafo de dependências entre pacotes. Alternativa Nx descartada por ser mais pesada para três pacotes.
- **Biome** em vez de ESLint + Prettier: uma ferramenta, rápida, sem plugins. Expo funciona bem com Biome.
- **Vitest** para daemon e protocolo (ESM nativo, rápido). O app usa Jest via `jest-expo` apenas onde for necessário testar componentes; lógica pura do app é testada com Vitest.
- **Protocolo consumido como fonte TypeScript** (`exports` apontando para `src/index.ts`): o Metro e o `tsx` resolvem TS direto, evitando etapa de build no desenvolvimento.
- Pacotes com `"type": "module"`.

## Risks / Trade-offs

- [Metro e symlinks do pnpm] → `node-linker=hoisted` no `.npmrc`, recomendado pela Expo para monorepos pnpm.
