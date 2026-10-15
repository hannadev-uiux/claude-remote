## Context

`install.sh` already updates: it fetches the ref into `~/.claude-remote/src` (detached, shallow), runs `pnpm install` and builds `dist/cli.js`, then opens `claude-remote setup`. The service (launchd/systemd) runs `node ~/.claude-remote/src/apps/daemon/dist/cli.js start`, so a rebuild plus a restart is a full update.

## Decisions

- **The installer does the heavy work.** Node, tools, pnpm and the build already live in `install.sh`; `claude-remote update` does not duplicate them. It only fetches and checks out the ref first, so the *new* `install.sh` runs (an old script would build new code with old steps). `install.sh --update` fetches again (a no-op) so `curl … | bash -s -- --update` works on its own.
- **Post-build steps run in the new code**: `install.sh --update` calls `node dist/cli.js update --finish --from <old version>` (hidden options). The new CLI knows what its launchers/hooks look like and restarts the service with `ServiceManager.install` (writes the definition again and restarts), only when the service is loaded. No questions, no pairing QR code.
- **Only the installer's checkout**: the source root is derived from the running `dist/cli.js` and must be `CLAUDE_REMOTE_SRC` or `~/.claude-remote/src`; a development clone is never checked out detached. Local changes (tracked files) stop the update, like the installer.
- **Up to date**: when `FETCH_HEAD` equals `HEAD` the command stops with the current version; `--force` rebuilds anyway.
- Pure parts (`updateSource`, `parseVersion`) are tested; git runs through the injected `Executor`.

## Risks

- `tsup` cleans `dist/` while the running daemon already loaded its bundle; it keeps working until the restart at the end. If the build fails, the old service keeps running the old process, and `claude-remote update` again (or the installer) recovers.
