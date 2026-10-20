## Why

The screenshots in `docs/screenshots` (the README header) show the app before the v0.12.0 redesign: old icon, orange accent, old list and conversation (issue #194). Retaking them from a real setup would show real project names, paths, branches and the computer's name. There is no way today to fill the app with believable sessions that hold no real data.

## What Changes

- **Demo sandbox:** `pnpm --filter @remote-harness/daemon demo` creates a throwaway environment and runs the real daemon in it, in development mode (`127.0.0.1`), on its own ports, data home (`REMOTE_HARNESS_HOME`), file token store and tmux server (`TMUX_TMPDIR`). It fills it with fictional profiles (Personal, Work, an OpenRouter profile and a Codex profile), git repositories with branches, worktrees, and Claude Code sessions in tmux panes. A session waits for a permission, one is running with a status line (model, context, usage limits), others are idle or ended. It prints a `remoteharness://pair?…` link for a simulator, keeps the permission pending while it runs, and removes everything it created on exit or with `--clean`.
- **Host name override:** `REMOTE_HARNESS_HOST_NAME` replaces the computer's name the daemon reports to the app (and the demo sets it to a generic name), so no screenshot shows the real one.
- **Screenshots:** the README screenshots are retaken from the demo in the dark theme on a current build: session list with the waiting strip, conversation with the context line, permission request, raw terminal, new session, settings and the iPad with its session sidebar. `pnpm --filter @remote-harness/mobile screenshots <folder>` turns the simulator captures into half-size palette PNGs in `docs/screenshots`, and the README header uses them. CONTRIBUTING.md describes how to retake them.

## Non-goals

- The store screenshot sets (pt-BR, en-US, es-ES at the store sizes), the lock screen live status and the iPad in landscape (three columns; rotating a simulator needs Simulator.app) stay with the store listing (#161).

## Capabilities

### New Capabilities
- `demo-mode`: the demo sandbox and the host name override

### Modified Capabilities

## Impact

- `apps/daemon/scripts/demo.mts` (new) and its pure parts in `apps/daemon/scripts/demo-data.ts` (tested), `package.json` script `demo`.
- `apps/daemon/src/core/paths.ts` (`hostName` reads `REMOTE_HARNESS_HOST_NAME`).
- `apps/mobile/scripts/screenshots.mts` (new) and its `screenshots` script.
- `docs/screenshots/*.png`, `README.md`, `README.pt-BR.md`, `CONTRIBUTING.md` (how to retake them).
