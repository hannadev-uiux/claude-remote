## Context

Inside WSL2 the daemon is a Linux daemon (change 23). What differs: getting WSL itself, the network (WSL2 is NAT'ed by default, so a Tailscale on Windows is not visible inside WSL) and keeping the distribution running.

## Goals / Non-Goals

**Goals:** one command from PowerShell; a working phone connection; daemon running after logon.

**Non-Goals:** a native Windows daemon (ConPTY instead of tmux); WSL1; Claude Code installed only on Windows (it must be installed inside WSL, which the setup checks).

## Decisions

- **install.ps1** is self-contained, wraps everything in a function (partial download safety), uses `wsl.exe --status/--list --quiet` to detect, `wsl --install -d Ubuntu --no-launch` to install, and then `wsl -d <distro> -- bash -lc "curl -fsSL https://maarkn.dev/claude-remote/install.sh | bash"`. The language comes from `(Get-Culture).Name`.
- **Networking choice**: prefer Tailscale inside WSL (works on every build, own 100.x address); offer mirrored networking (Windows 11 22H2+) as the alternative when Tailscale already runs on Windows. Detection is pure functions over `os.networkInterfaces()` and file contents; editing `.wslconfig` goes through `/mnt/c/Users/<user>/.wslconfig`, found with `wslpath`/`cmd.exe /c echo %UserProfile%`.
- **systemd in WSL**: `/etc/wsl.conf` needs root; the setup shows the exact command and runs it with `sudo` only after consent, then asks the user to run `wsl --shutdown` from Windows.
- **Logon task**: `schtasks.exe /Create /SC ONLOGON /TN "Claude Remote" /TR "wsl.exe -d <distro> --exec /bin/true"` (keeps the distro booted so systemd starts the unit); optional and removable with `claude-remote service uninstall`.

## Risks / Trade-offs

- WSL shuts down idle distributions → systemd + the logon task keep it alive; documented `vmIdleTimeout`.
- Corporate machines may block WSL → `install.ps1` stops with the reason.
