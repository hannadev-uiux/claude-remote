## Why

The daemon and installer only run on macOS: `install.sh` aborts outside Darwin, the pairing token lives in the macOS Keychain, the background service is a launchd LaunchAgent and dependencies come from Homebrew. Many Claude Code users work on Linux machines and servers. (Issue #9)

## What Changes

- **Platform layer** in the daemon: `infra/platform.ts` detects `darwin`/`linux` once and the composition root picks the adapters; features keep depending on interfaces.
- **Secrets on Linux**: Secret Service through `secret-tool` (libsecret) when available and unlocked; otherwise the existing `0600` file store. `CLAUDE_REMOTE_TOKEN_STORE` still forces one.
- **Service on Linux**: systemd **user** unit `~/.config/systemd/user/claude-remote.service` (`Restart=always`, captured `PATH`, logs in `~/.claude-remote/logs`), managed with `systemctl --user`; `loginctl enable-linger` is offered by the setup so the daemon survives logout and starts at boot. Without systemd, the setup explains how to run `claude-remote start` instead.
- **Shell PATH**: the launcher dir is added to `~/.zshrc` and/or `~/.bashrc` (the ones that exist, or the one of `$SHELL`), always read → merge → backup → atomic write.
- **install.sh** accepts Linux: installs `tmux`, `ripgrep`, `git` and `zsh` (the launchers are zsh scripts) with apt, dnf, pacman or zypper (sudo prompted), or brew if present; Node 24+ check unchanged.
- `doctor`, `service install|uninstall|status`, the setup wizard and texts are platform-aware ("Mac" → the machine name / "computer").
- CI runs the daemon tests on `ubuntu-latest` too.

## Capabilities

### New Capabilities
- `platform-support`: supported operating systems and the per-platform adapters (secrets, service, shell, packages).

### Modified Capabilities

## Impact

`apps/daemon` (`infra/platform.ts`, secrets, `features/service`, hooks installer PATH, setup, doctor, CLI), `install.sh`, README, CI workflow, i18n catalogs.
