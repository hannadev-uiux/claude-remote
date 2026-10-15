## Why

Claude Remote drives Claude Code through tmux, which does not run natively on Windows, so Windows users cannot use it. Claude Code on Windows is best supported inside WSL2, where tmux and the Linux daemon already work (change 23). (Issue #10)

## What Changes

- **`install.ps1`** (`irm https://maarkn.dev/claude-remote/install.ps1 | iex`): checks Windows 10 2004+/11, installs WSL2 with Ubuntu when missing (`wsl --install -d Ubuntu`, asking for the reboot if needed), then runs the Linux one-line installer inside the WSL distribution. Messages in the three languages.
- **WSL detection** in the daemon (`/proc/sys/kernel/osrelease` contains `microsoft`/`WSL`): platform `linux` with a `wsl` flag used by the setup, `doctor` and texts.
- **Networking**: the daemon needs a Tailscale address. The setup checks, in order: Tailscale running inside WSL, or WSL **mirrored networking** (`networkingMode=mirrored` in `%UserProfile%\.wslconfig`) exposing the Windows Tailscale interface; it explains both and can write the `.wslconfig` setting (read → merge → backup → write).
- **Service**: systemd inside WSL (`[boot] systemd=true` in `/etc/wsl.conf`, enabled with consent) runs the change-23 user unit; an optional Windows Scheduled Task starts the distribution at logon so the daemon is up without a terminal.
- **Redirect** `maarkn.dev/claude-remote/install.ps1` → `install.ps1` on `main`; README section for Windows.

## Capabilities

### New Capabilities

### Modified Capabilities
- `platform-support`: Windows through WSL2.

## Impact

New `install.ps1`, `apps/daemon` (WSL detection, setup/doctor networking checks, `.wslconfig`/`wsl.conf` helpers), `maarkn.dev` redirect, README, i18n catalogs. Depends on change 23.
