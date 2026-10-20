---
title: Getting started
description: Requirements, the one-line install on macOS, Linux and Windows (WSL2), the app, and pairing.
applies: 0.7+
---

## Requirements

- A computer running macOS, Linux (systemd recommended) or Windows 10 2004+ / 11 through WSL2, with `tmux`, `git`, `rg` (ripgrep), `zsh` and `claude` on the `PATH`. The installer adds the missing tools.
- Node 24+. The installer downloads a private Node into `~/.remote-harness/node` when it is missing, without touching your system Node.
- [Tailscale](https://tailscale.com) on the computer and on the phone, signed in to the same tailnet.
- An iPhone or iPad (iOS 17+) or an Android phone (Android 10+).

## Install on the computer

One address for every system: `https://remoteharness.app/install` gives curl the macOS / Linux script and PowerShell the Windows one. Opened in a browser on the computer, it shows the right command with a copy button. Add `?ref=<branch|tag>` for another version, e.g. `curl -fsSL "https://remoteharness.app/install?ref=development" | bash`.

### macOS and Linux

```bash
curl -fsSL https://remoteharness.app/install | bash
```

The installer checks the system and Node, installs the missing tools (Homebrew on macOS; apt, dnf, pacman or zypper on Linux, with `sudo` after telling you why), puts the source in `~/.remote-harness/src`, builds the daemon and opens the guided setup (`remote-harness setup`), which:

- finds your Claude Code accounts (`~/.claude`, `~/.claude-*`) and lets you pick the ones to control, or creates a new one and opens Claude Code there so you can log in;
- asks the alias of each one: the command that opens that account inside tmux (for example `personal`, `work`);
- can add an [OpenRouter profile](/en/docs/daemon/#profiles-and-openrouter): Claude Code paid with your OpenRouter key, which it checks and keeps in the OS secret store;
- installs the launchers, the `PATH` entry and the hooks (with backups), and the background service;
- helps with Tailscale and shows the pairing QR code.

Options: `bash -s -- --yes` skips the questions, `bash -s -- --ref <branch|tag>` installs another version, `bash -s -- --update` updates without the setup.

### Windows (WSL2)

Remote Harness drives Claude Code through tmux, so on Windows it runs inside WSL2, where Claude Code is best supported too. In PowerShell:

```powershell
irm https://remoteharness.app/install | iex
```

The script checks Windows 10 2004+ or Windows 11, installs WSL2 with Ubuntu when it is missing (Windows asks for administrator permission; reboot if asked, then run the same command again), helps create the Linux user and runs the Linux installer inside the distribution. Node and Claude Code must be installed inside WSL, not only on Windows. Options: `& ([scriptblock]::Create((irm https://remoteharness.app/install))) -Distro Ubuntu-24.04 -Ref main -Yes -NoService`.

systemd, starting at logon and Tailscale inside WSL are covered in [Troubleshooting](/en/docs/troubleshooting/#windows-wsl2).

### From a clone

```bash
git clone https://github.com/maarkN/remote-harness.git
cd remote-harness
pnpm install
pnpm --filter @remote-harness/daemon build
node apps/daemon/dist/cli.js setup
```

## Install the app

- **iPhone and iPad**: a development build for now (TestFlight is coming). With Xcode on a Mac, `cd apps/mobile && pnpm ios` runs it on the simulator or a connected device; `make install-ios` makes a release build for a connected iPhone or iPad. [CONTRIBUTING.md](https://github.com/maarkN/remote-harness/blob/main/CONTRIBUTING.md#building-and-releasing) has the signing details.
- **Android**: the APK from [GitHub Releases](https://github.com/maarkN/remote-harness/releases) (allow installs from your browser when asked), or `pnpm android` and `pnpm build:android` from the repository.

Install Tailscale on the phone as well and sign in to the same tailnet as the computer.

## Pair the phone

The setup ends with a QR code; `remote-harness pair` shows it again at any time. Open the app, scan it, and you are in: the app keeps the token in the phone's secure storage and connects over Tailscale.

Installed the app first? Its pairing screen has a step-by-step guide for the computer side, including the install command to share.

Trying it on a simulator without Tailscale: `remote-harness start --dev` binds the daemon to `127.0.0.1` and `remote-harness pair --dev` prints a matching code. On the Android emulator also run `adb reverse tcp:7337 tcp:7337`.

## First session

Run your alias instead of `claude`, with the same arguments:

```bash
personal            # opens Claude Code in tmux with that account
work --resume       # another account
```

Both appear in the app, fully controllable. Sessions started with plain `claude` outside tmux appear too, read-only, and can be resumed from the phone.

## Update

`remote-harness update` fetches the new version, rebuilds, refreshes the hooks and restarts the service without asking the setup questions. The background service also checks for updates every 6 hours and shows a desktop notification; see [updates and channels](/en/docs/daemon/#updates-and-channels).
