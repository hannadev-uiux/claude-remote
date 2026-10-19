---
title: Troubleshooting
description: Connection, Tailscale, push, sleep, read-only sessions, aliases, WSL, version mismatch, OpenRouter.
applies: 0.7+
---

Start with `remote-harness doctor` on the computer: it checks the tools, Tailscale, the config, the profiles, the token store, the service, push and the registered phones, and prints the command that fixes each failed check.

## The app cannot connect

- Both devices must be on the same tailnet and Tailscale must be connected on both. Open the Tailscale app on the phone and check the computer appears.
- The daemon must be running: `remote-harness service status`, or `remote-harness start` in a terminal to see the log.
- A token rotated on the computer (`remote-harness rotate-token`) or a reinstall means pairing again: **Forget this machine** in Settings, then scan `remote-harness pair`.
- On a simulator or emulator without Tailscale, use `remote-harness start --dev` and `remote-harness pair --dev` (Android emulator: `adb reverse tcp:7337 tcp:7337`).

## Tailscale not found

The daemon binds only to a 100.x address. If `doctor` says there is none: install Tailscale, sign in (`sudo tailscale up` on Linux) and start the daemon again; the background service waits for the interface instead of failing. On WSL see [below](#windows-wsl2).

## Push does not arrive

- The app must have the notification permission; Settings → Notifications shows the state and has **Send test notification**.
- `remote-harness push status` shows the mode: the relay (the app build needs the relay URL), your Firebase service account at `~/.remote-harness/firebase-service-account.json`, or `off` in the config.
- A profile or session may be muted: check the **Muted** row in Settings.
- With the relay, each phone needs a grant: `doctor` says when none has one.
- On Android, notifications use the high-priority `claude-remote` channel; check it is not silenced in the system settings. Allow and Deny buttons are not shown on Android notifications: tap to answer in the app.

## The computer sleeps or locks

The daemon only works while the computer is awake. On a MacBook, keep it plugged in and disable sleep while connected to power, or use `caffeinate`; on Linux check the power settings. Locking the screen is fine. Sessions in tmux survive a disconnection of the app and reconnect when it returns.

## Sessions are read-only

A session started with plain `claude` outside tmux appears in the app but cannot be typed into. Tap **Resume** to reopen it inside tmux, fully controllable, with the same history. Always start sessions through your alias to avoid this.

## The alias is not found

The launchers live in `~/.remote-harness/bin`, added to the `PATH` of `~/.zshrc` and `~/.bashrc` by the setup. Open a new terminal (or `source ~/.zshrc`); if the alias is still missing, run `remote-harness install`. Launchers run with `zsh`, which the installer adds on Linux when missing.

## App and daemon versions differ

The app says when the daemon is older than it needs. Run `remote-harness update` on the computer (or update from the tray). The app itself updates over the air when it was built with an update server; Settings → App shows the version and **Check for updates**.

## Windows (WSL2)

- **systemd**: the background service needs `[boot] systemd=true` in `/etc/wsl.conf`; the setup shows the command and asks you to run `wsl --shutdown` from PowerShell afterwards.
- **Starting at logon**: WSL only runs while something uses it. The setup can create the Windows scheduled task "Remote Harness" that starts the distribution at logon; `remote-harness service uninstall` removes it. If WSL still stops when idle, raise `vmIdleTimeout` in `[wsl2]` of `%UserProfile%\.wslconfig`.
- **Tailscale**: WSL2 uses NAT by default, so a Tailscale running on Windows is not visible inside WSL. Either run Tailscale inside WSL (`curl -fsSL https://tailscale.com/install.sh | sh` and `sudo tailscale up`) or keep it on Windows and turn on mirrored networking (Windows 11 22H2+): the setup can add `networkingMode=mirrored` to `[wsl2]` in `.wslconfig`, then run `wsl --shutdown`.
- `remote-harness doctor` shows the distribution, the networking mode, systemd and the logon task.

## An OpenRouter profile will not start

The launcher refuses to open a window when the profile has no key and prints the command to run: `remote-harness provider key <profile>`. `doctor` lists the provider profiles and whether each has a key. Open sessions keep the key they started with; new ones read it again.

## Getting help

Open an issue with the output of `remote-harness doctor`, the versions (OS, Node, Claude Code, the app) and the daemon logs from `~/.remote-harness/logs`, after removing tokens and session content. Security problems go to [Security & privacy](/en/docs/security/#reporting-a-vulnerability), never to public issues.
