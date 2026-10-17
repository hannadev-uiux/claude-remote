# Contributing to Remote Harness

Thanks for your interest! Bug reports, ideas, docs and code are all welcome.

## Ground rules

- Be kind — see the [Code of Conduct](CODE_OF_CONDUCT.md).
- **Security issues go to [SECURITY.md](SECURITY.md)**, never to public issues. The daemon is a remote shell; we take that seriously.
- For anything bigger than a small fix, **open an issue first** so we can agree on the approach.

## Setup

Requirements: macOS or Linux, Node 24+, pnpm 12+, tmux, git, ripgrep, zsh; Xcode on a Mac (iOS) or the Android SDK with JDK 17 (Android) for the app.

```bash
pnpm install
pnpm check                                            # typecheck + tests + Biome — must be green
pnpm --filter @remote-harness/daemon dev start --dev   # daemon from source on 127.0.0.1
pnpm --filter @remote-harness/mobile ios               # app on the iOS simulator
pnpm --filter @remote-harness/mobile android           # app on an Android emulator
```

Architecture, folder layout and conventions are in [CLAUDE.md](CLAUDE.md) — please read it before changing code.

## Workflow

1. **Specs first (OpenSpec).** Features and behavior changes start as an [OpenSpec](https://github.com/Fission-AI/OpenSpec) change in `openspec/changes/`, with a proposal, spec deltas and tasks. Validate with `openspec validate <change> --strict`. When merged, the change is archived into `openspec/specs/`. Small fixes and docs don't need a change. OpenSpec artifacts are always written in English (en-US).
2. **Branch** from `development`: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`.

   | Branch | Purpose |
   |---|---|
   | `development` | Integration branch. Every PR targets it. |
   | `main` | Stable releases only, merged from `development` and tagged (`vX.Y.Z`). The one-line installer installs from `main`. |

   Urgent fixes to a release may branch from `main` as `hotfix/<topic>` and are merged back into `development` too.
   When a release only changes app JavaScript, it can also go out over the air: publish it with `ota:publish` (see *App updates over the air* in the README). Releases that add native modules need a new build.
3. **Code** following the conventions:
   - Strict TypeScript, no `any` — `unknown` + Zod at the edges.
   - New WebSocket message? Schema in `packages/protocol` → handler in the daemon → usage in the app.
   - Pure logic (parsers, selectors, detectors) in separate functions with Vitest tests; side effects live in `infra/` (daemon) and `core/` (app) and are injected.
   - Only `features/transcript/parser.ts` knows the Claude Code `.jsonl` format; TUI labels live in one tested table.
   - Writes to user files are read → merge → backup → atomic write, and idempotent.
   - Native app dependencies are added with `npx expo install`.
   - UI text always goes through i18n with typed catalogs in `pt-BR`, `en-US` and `es-ES` (same keys in all three, checked by tests); code and identifiers are English.
4. **Test.** `pnpm check` must pass. Add tests for new logic; describe manual checks (simulator, real tmux session) in the PR.
5. **Commit** with [Conventional Commits](https://www.conventionalcommits.org/) in English:

   ```
   feat(daemon): add per-profile mute
   fix(mobile): keep composer above the keyboard
   docs: clarify Tailscale setup
   ```

   Types: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `chore`. Scopes: `daemon`, `mobile`, `protocol`, `openspec`.
6. **Open a PR against `development`** using the template. Keep it focused; screenshots or a short video for UI changes are much appreciated.

## Reporting bugs

Use the bug report template and include `remote-harness doctor` output, versions (macOS, Node, Claude Code, iOS) and daemon logs from `~/.remote-harness/logs` — **redact tokens and session content**.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
