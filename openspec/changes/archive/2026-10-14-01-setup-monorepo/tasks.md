## 1. Workspace structure

- [x] 1.1 Create the root `package.json`, `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `.npmrc` (`node-linker=hoisted`), `.nvmrc` and `.gitignore`; verify with `pnpm install` running without errors
- [x] 1.2 Create a strict `tsconfig.base.json` and verify that `pnpm -r exec tsc --noEmit` runs in the packages
- [x] 1.3 Create the `apps/daemon`, `apps/mobile`, `packages/protocol` directories with a minimal `package.json`; verify with `pnpm ls -r --depth -1`

## 2. Tooling

- [x] 2.1 Configure Biome (`biome.json`) and the `lint` script; verify with `pnpm lint` passing
- [x] 2.2 Configure Turborepo (`turbo.json`) with the `typecheck`, `lint`, `test`, `build` tasks and the aggregate `pnpm check` script; verify with `pnpm check` passing
- [x] 2.3 Configure Vitest in the protocol package and in the daemon with a smoke test; verify with `pnpm test`
