## 1. tmux client primitives

- [ ] 1.1 Add `listClients(target: string): Promise<{ tty: string }[]>` to `TmuxClient` (`apps/daemon/src/infra/tmux.ts`), wrapping `tmux list-clients -t <target> -F "#{client_tty}"`, returning `[]` when the tmux server is absent (same `NO_SERVER` check as `listPanes`); cover with a Vitest test using a fake `Executor`.
- [ ] 1.2 Add `switchClient(clientTty: string, target: string): Promise<void>` to `TmuxClient`, wrapping `tmux switch-client -c <clientTty> -t <target>`; cover with a Vitest test asserting the exact args passed to the executor.

## 2. Pure command planning

- [ ] 2.1 Create `apps/daemon/src/features/pane/terminal-focus.ts` exporting `ExecStep = { file: string; args: string[] }`, the darwin app table (iTerm2, Ghostty, WezTerm, kitty, Alacritty, Terminal.app — id, process name(s), `activate(): ExecStep`, `openRunning(shellCommand: string): ExecStep`) per the exact commands in design.md, and `shellQuote`/`attachCommand(paneId): string`.
- [ ] 2.2 Add `pickTerminalApp(runningProcessNames: readonly string[]): AppSpec` (darwin table, priority order, falls back to Terminal.app) and export it for testing.
- [ ] 2.3 Add `planShowInTerminal(input: { platform: Platform; wsl: WslInfo | null; hasAttachedClient: boolean; runningProcessNames: readonly string[]; terminalEnv: string | null; paneId: string }): ExecStep[]` combining the above per design.md's per-platform decisions (darwin: activate vs. open picked app; linux: `$TERMINAL`/`x-terminal-emulator`, open-only; wsl: `wt.exe`, open-only).
- [ ] 2.4 Vitest tests for `pickTerminalApp` (each priority level, fallback to Terminal.app) and `planShowInTerminal` (darwin attached/not-attached for at least two apps, linux attached/not-attached with and without `$TERMINAL`, wsl attached/not-attached), asserting the exact `ExecStep[]` returned.

## 3. Wiring

- [ ] 3.1 Add `listRunningApps(): Promise<string[]>` to `Desktop` (`apps/daemon/src/infra/desktop.ts`), darwin-only (`osascript -e 'tell application "System Events" to get name of every process whose background only is false'`, split on `, `), `[]` on every other platform and on any `exec` failure.
- [ ] 3.2 Add `showInTerminal(paneId: string): Promise<void>` to `Desktop`: calls `ctx.tmux.listClients(paneId)`, `switchClient` for each attached client (or none), `ctx.tmux.focusPane(paneId)`, lists running apps when on darwin, builds the plan with `planShowInTerminal`, and runs each returned `ExecStep` via the injected `Executor` — letting a failed step throw (no `ignore()`).
- [ ] 3.3 Replace the body of `pane.focus`'s handler (`apps/daemon/src/features/pane/index.ts:18`) and the tray's `focusSession` (`apps/daemon/src/features/updates/index.ts:310`) to call the new `showInTerminal` instead of `ctx.tmux.focusPane` directly; verify both call sites still resolve `paneId` through `requireControllable`/the session store exactly as before.

## 4. Label and i18n

- [ ] 4.1 Rename the `focus` tray label in `apps/daemon/src/core/i18n/en-US.ts`, `pt-BR.ts` and `es-ES.ts` from "Focus in tmux"/"Focar no tmux"/"Enfocar en tmux" to "Open in terminal (tmux)"/"Abrir no terminal (tmux)"/"Abrir en la terminal (tmux)"; run the existing i18n parity test to confirm the three catalogs still match key-for-key.
- [ ] 4.2 Update the two comments referencing the old label (`apps/daemon/src/features/pane/index.ts:17`, `packages/protocol/src/client.ts:159`) to the new wording.

## 5. Validation

- [ ] 5.1 Run `pnpm check` at the repo root and confirm it is green (typecheck, Vitest, Biome).
- [ ] 5.2 Manually verify on a Mac with tmux running: (a) with a terminal attached to a different session, picking "Open in terminal (tmux)" switches and raises it; (b) with no terminal attached, it opens a new window attached to the right pane. Record the result in the PR description since this path is not covered by Vitest (it calls real OS processes).
