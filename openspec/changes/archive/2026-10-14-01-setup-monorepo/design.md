## Context

New project, no code yet. Node 24 and pnpm 12 are installed on the machine.

## Goals / Non-Goals

**Goals:** a single command (`pnpm check`) runs typecheck, lint and tests across all packages.

**Non-Goals:** remote CI, package publishing.

## Decisions

- **pnpm workspaces + Turborepo**: task caching and a dependency graph between packages. Nx was ruled out as too heavy for three packages.
- **Biome** instead of ESLint + Prettier: one tool, fast, no plugins. Expo works well with Biome.
- **Vitest** for the daemon and the protocol (native ESM, fast). The app uses Jest via `jest-expo` only where components need testing; the app's pure logic is tested with Vitest.
- **Protocol consumed as TypeScript source** (`exports` pointing to `src/index.ts`): Metro and `tsx` resolve TS directly, avoiding a build step during development.
- Packages use `"type": "module"`.

## Risks / Trade-offs

- [Metro and pnpm symlinks] → `node-linker=hoisted` in `.npmrc`, as recommended by Expo for pnpm monorepos.
