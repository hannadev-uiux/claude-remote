## Why

Claude Remote has three parts that need to share types (app, daemon and protocol). Without a monorepo with common tooling, each part would drift apart in TypeScript version, lint and tests, and the WebSocket protocol would break silently.

## What Changes

- pnpm workspaces + Turborepo monorepo with `apps/daemon`, `apps/mobile` and `packages/protocol`.
- Shared strict `tsconfig.base.json` (TypeScript `strict`, `noUncheckedIndexedAccess`).
- Biome for lint and formatting; Vitest for tests; `typecheck`, `lint`, `test`, `build` scripts orchestrated by Turborepo.
- `.gitignore`, `.editorconfig`, `.nvmrc` and an initial README.

## Capabilities

### New Capabilities
<!-- None: tooling-only change (skip_specs: true). -->

### Modified Capabilities
<!-- None. -->

## Impact

Creates the directory structure and the dev dependencies used by all subsequent changes.
