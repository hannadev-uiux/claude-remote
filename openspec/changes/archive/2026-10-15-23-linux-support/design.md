## Context

macOS-only code: `core/secrets.ts` (`security` CLI), `features/service/launchd.ts` (LaunchAgent + app bundle), `installZshrc`, `install.sh` (`uname` check, Homebrew), texts that say "Mac". tmux, ripgrep, git, Tailscale and Claude Code all exist on Linux, and `findTailscaleAddress` already works with `os.networkInterfaces()`.

## Goals / Non-Goals

**Goals:** Linux desktop and headless servers (systemd), same commands and flows as macOS, no regression on macOS.

**Non-Goals:** non-systemd init systems beyond a documented manual start; distro packages (deb/rpm); Windows (separate change, built on this one).

## Decisions

- **Platform type** `'darwin' | 'linux'` resolved from `process.platform`; unsupported platforms fail early with a clear message. Adapters are chosen in `main.ts`/`cli.ts` and injected.
- **`ServiceManager` interface** (`install`, `uninstall`, `status`) with `LaunchdService` (existing code) and `SystemdUserService`. The systemd unit is rendered by a pure function (tested); `systemctl --user daemon-reload`, `enable --now` and `restart` are run through the injected `Executor`. Linger: `loginctl enable-linger $USER` only after the user agrees.
- **Secrets**: `SecretToolTokenStore` uses `secret-tool store/lookup --label=claude-remote service claude-remote account pairing-token` (token passed on stdin, never as an argument). Picked when `secret-tool` exists and a lookup does not fail with "no secret service"; otherwise `FileTokenStore` (0600). If the token is already in the file, the file store is kept so pairing survives. The choice is recorded in `~/.claude-remote/token-store` (so the service at boot, maybe without a session bus, uses the same store), logged and shown by `doctor`; a Secret Service error on lookup is an error, never "no token" (which would silently generate a new one).
- **Shell rc**: generalize `installZshrc` to `installShellPath(files)`; target `~/.zshrc` and `~/.bashrc` that exist plus the rc of `$SHELL`; same marker block; backup + atomic write (fixes the current non-atomic write).
- **install.sh**: `detect_platform` (Darwin/Linux), `install_packages` per package manager; never runs `sudo` without saying why. It also installs `zsh`: the launchers are zsh scripts (now `#!/usr/bin/env zsh`, since Linux has no `/bin/zsh` by default) and `doctor` checks it.
- **Texts**: catalogs get a `{machine}` placeholder (`Mac`/`computador`/`computer`/`ordenador`).

## Risks / Trade-offs

- Headless servers without a Secret Service → file store (0600), like other CLIs; documented.
- systemd user services stop at logout without linger → offered by the setup and checked by `doctor`.
