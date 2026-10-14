## 1. Estrutura do workspace

- [x] 1.1 Criar `package.json` raiz, `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `.npmrc` (`node-linker=hoisted`), `.nvmrc` e `.gitignore`; verificar com `pnpm install` sem erros
- [x] 1.2 Criar `tsconfig.base.json` estrito e verificar que `pnpm -r exec tsc --noEmit` roda nos pacotes
- [x] 1.3 Criar diretórios `apps/daemon`, `apps/mobile`, `packages/protocol` com `package.json` mínimo; verificar com `pnpm ls -r --depth -1`

## 2. Tooling

- [x] 2.1 Configurar Biome (`biome.json`) e script `lint`; verificar com `pnpm lint` passando
- [x] 2.2 Configurar Turborepo (`turbo.json`) com tarefas `typecheck`, `lint`, `test`, `build` e o script agregado `pnpm check`; verificar com `pnpm check` passando
- [x] 2.3 Configurar Vitest no pacote de protocolo e no daemon com um teste de fumaça; verificar com `pnpm test`
