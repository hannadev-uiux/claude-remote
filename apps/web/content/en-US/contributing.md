---
title: Contributing
description: How the project is built, how to set it up, and how to help.
---

Bug reports, ideas, docs and code are all welcome. The repository's [CONTRIBUTING.md](https://github.com/maarkN/remote-harness/blob/main/CONTRIBUTING.md) has the full workflow; this page is the short version.

## How it is built

A pnpm monorepo in strict TypeScript: the daemon (`apps/daemon`, Node), the app (`apps/mobile`, Expo and React Native), the push relay (`apps/push-relay`, a Cloud Function), this site (`apps/web`, a Node server in Docker) and the WebSocket protocol they share (`packages/protocol`, Zod schemas). Every feature starts as an [OpenSpec](https://github.com/Fission-AI/OpenSpec) change with a proposal, spec deltas and tasks; the archived changes are the project's history. Architecture and conventions live in [CLAUDE.md](https://github.com/maarkN/remote-harness/blob/main/CLAUDE.md).

## Setup

macOS or Linux with Node 24+, pnpm 12+, tmux, git, ripgrep and zsh; Xcode on a Mac for iOS, the Android SDK with JDK 17 for Android.

```bash
pnpm install
pnpm check                                             # typecheck + tests + Biome, must be green
pnpm --filter @remote-harness/daemon dev start --dev    # daemon from source on 127.0.0.1
pnpm --filter @remote-harness/mobile ios               # app on the iOS simulator
pnpm --filter @remote-harness/mobile android           # app on an Android emulator
```

## Workflow

1. For anything bigger than a small fix, open an issue first.
2. Branch from `development` (`feat/<topic>`, `fix/<topic>`, `docs/<topic>`); `main` holds releases only.
3. Behavior changes start as an OpenSpec change (`openspec validate <change> --strict`), written in English.
4. UI text goes through the typed catalogs in pt-BR, en-US and es-ES; pure logic gets Vitest tests.
5. Commit with Conventional Commits, open a pull request against `development`.

## Reporting bugs

Use the issue template and include `remote-harness doctor`, the versions (OS, Node, Claude Code, the app) and the daemon logs from `~/.remote-harness/logs`, with tokens and session content removed. Security issues go through [GitHub Security Advisories](https://github.com/maarkN/remote-harness/security/advisories/new), never public issues.

## License

MIT. By contributing you agree that your contributions are licensed the same way.
