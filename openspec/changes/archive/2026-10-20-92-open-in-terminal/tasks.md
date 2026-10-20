## 1. tmux client primitives

- [x] 1.1 Add `listClients(target: string): Promise<{ tty: string }[]>` to `TmuxClient` (`apps/daemon/src/infra/tmux.ts`), wrapping `tmux list-clients -t <target> -F "#{client_tty}"`, returning `[]` when the tmux server is absent (same `NO_SERVER` check as `listPanes`); cover with a Vitest test using a fake `Executor`.
- [x] 1.2 Add `switchClient(clientTty: string, target: string): Promise<void>` to `TmuxClient`, wrapping `tmux switch-client -c <clientTty> -t <target>`; cover with a Vitest test asserting the exact args passed to the executor.

## 2. Pure command planning

- [x] 2.1 Create `apps/daemon/src/features/pane/terminal-focus.ts` exporting `ExecStep` (re-exported from `infra/desktop.ts`, which owns the type so infra never depends on `features/`), the darwin app table (iTerm2, Ghostty, WezTerm, kitty, Alacritty, Terminal.app — id, process name(s), `activate(): ExecStep`, `openRunning(shellCommand: string): ExecStep`) per the exact commands in design.md, and `shellQuote`/`attachCommand(paneId): string`.
- [x] 2.2 Add `pickTerminalApp(runningProcessNames: readonly string[]): TerminalApp` (darwin table, priority order, falls back to Terminal.app) and export it for testing.
- [x] 2.3 Add `planShowInTerminal(input: { platform: Platform; wsl: boolean; hasAttachedClient: boolean; runningProcessNames: readonly string[]; terminalEnv: string | null; paneId: string }): ExecStep[]` combining the above per design.md's per-platform decisions (darwin: activate vs. open picked app; linux: `$TERMINAL`/`x-terminal-emulator`, open-only; wsl: `wt.exe`, open-only). `wsl` narrowed from `WslInfo | null` to `boolean` to match how the rest of `features/updates` already calls `currentWsl()`.
- [x] 2.4 Vitest tests for `pickTerminalApp` (priority order, fallback to Terminal.app) and `planShowInTerminal` (darwin attached/not-attached for two apps, linux attached/not-attached with and without `$TERMINAL`, wsl attached/not-attached), asserting the exact `ExecStep[]` returned.

## 3. Wiring

- [x] 3.1 Add `listRunningApps(): Promise<string[]>` and `runSteps(steps): Promise<void>` to `Desktop` (`apps/daemon/src/infra/desktop.ts`). `listRunningApps` is darwin-only (`osascript -e 'tell application "System Events" to get name of every process whose background only is false'`, split on `,`), `[]` on every other platform and on any `exec` failure; `runSteps` runs each `ExecStep` in order and throws on the first failing one (unlike the existing `ignore()`-based methods).
- [x] 3.2 Add `showInTerminal(tmux, desktop, platform, wsl, paneId)` to `apps/daemon/src/features/pane/show-in-terminal.ts` (not a `Desktop` method — `Desktop` has no `TmuxClient` access today and giving it one would be a bigger wiring change than this fix needs): lists attached clients, `switchClient`s each one, `focusPane`s, lists running apps on darwin, builds the plan with `planShowInTerminal`, and runs it via `desktop.runSteps`.
- [x] 3.3 Call the new `showInTerminal` from `pane.focus`'s handler (`apps/daemon/src/features/pane/index.ts`) and the tray's `focusSession` (`apps/daemon/src/features/updates/index.ts`), each constructing/reusing its own `Desktop` via `createDesktop(ctx.exec, platform, { wsl })` (`pane/index.ts` builds one locally, matching the existing pattern in `features/updates`); both call sites still resolve `paneId` exactly as before (`requireControllable`/the session store).

## 4. Label and i18n

- [x] 4.1 Rename the `focus` tray label in `apps/daemon/src/core/i18n/en-US.ts`, `pt-BR.ts` and `es-ES.ts` from "Focus in tmux"/"Focar no tmux"/"Enfocar en tmux" to "Open in terminal (tmux)"/"Abrir no terminal (tmux)"/"Abrir en la terminal (tmux)"; the existing i18n parity test (`test/i18n.test.ts`) passes unchanged (it checks keys, not values).
- [x] 4.2 Update the two comments referencing the old label (`apps/daemon/src/features/pane/index.ts`, `packages/protocol/src/client.ts`) to the new wording.

## 5. Validation

- [x] 5.1 `pnpm --filter @remote-harness/daemon typecheck|test`, `pnpm --filter @remote-harness/protocol typecheck|test`, full `pnpm check` (typecheck + test across all packages: daemon 514, mobile 504, protocol 118, all green) and `biome check --error-on-warnings apps packages` (587 files, clean). The repo-root `biome check --error-on-warnings .` step of `pnpm check` itself fails in this sandbox for an unrelated reason: it resolves its VCS/ignore root through the git **worktree**'s `.git` file, which appears to make every path under this worktree's own nested location look excluded by the `!**/.claude` rule — reproduces on an untouched checkout, not caused by this change.
- [ ] 5.2 Manually verify on a Mac with tmux running: (a) with a terminal attached to a different session, picking "Open in terminal (tmux)" switches and raises it; (b) with no terminal attached, it opens a new window attached to the right pane. **Not run** — this sandbox has no tmux server/GUI terminal to attach; needs manual verification before shipping.
