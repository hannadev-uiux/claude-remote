<div align="center">

<img src="apps/mobile/assets/icon.png" width="112" alt="Claude Remote icon" />

# Claude Remote

**Follow and drive the Claude Code sessions running on your Mac, Linux or Windows (WSL) machine — from your iPhone or Android phone.**

Self-hosted: a small daemon on your computer, a native app on your phone, a private Tailscale link in between.<br/>No cloud relay, no account-wide notifications, every Claude Code profile in one list.

[![License: MIT](https://img.shields.io/badge/license-MIT-D97757.svg)](LICENSE)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20WSL%20%2B%20iOS%20%7C%20Android-161616.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg)
![Expo SDK 57](https://img.shields.io/badge/Expo-SDK%2057-000020.svg)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-98C379.svg)](CONTRIBUTING.md)

[Português](README.pt-BR.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

</div>

<p align="center">
  <img src="docs/screenshots/sessions.png" width="23%" alt="Session list" />
  <img src="docs/screenshots/conversation.png" width="23%" alt="Conversation" />
  <img src="docs/screenshots/permission.png" width="23%" alt="Permission request" />
  <img src="docs/screenshots/terminal.png" width="23%" alt="Raw terminal" />
</p>

---

## Why

Claude Code is at its best on long, autonomous tasks — which is exactly when you walk away from the desk. Then it stops to ask for permission to run `pnpm test`, and the whole task waits until you are back.

The built-in remote control (`/rc`) helps, but it did not fit a real setup:

- **It notifies every device on the account**, including ones that should never receive anything.
- **It works with one account at a time.** Many of us run two Claude Code logins on the same computer (personal and work, via `CLAUDE_CONFIG_DIR`) and want a single view of both.
- **There is no public API to attach to a live interactive session** from another process.

Claude Remote solves this with tools you already trust: sessions run inside **tmux**, Claude Code reports what happens through its native **HTTP hooks**, and a local **daemon** bridges both to the phone over **Tailscale**.

## What it does

| | |
|---|---|
| 📋 **One list, every profile** | Sessions from all your Claude Code profiles (`~/.claude`, `~/.claude-work`, …), grouped by project, with live state (running, waiting, idle). |
| 💬 **Live conversation** | The same history you see on the computer: markdown, thinking, tool calls, diffs, results — streamed in real time and paginated. |
| ⌨️ **Send prompts** | Type into the very same process that is open on the computer. `Esc` and `Ctrl+C` included. |
| ✅ **Approve permissions** | Allow, deny or **always allow** (written as a rule by Claude Code itself, undoable with `claude-remote rules undo`). |
| 🔀 **Switch permission mode** | Default, accept edits, plan, auto. `bypassPermissions` is intentionally never offered. |
| 🔎 **Autocomplete** | `@files` (git/ripgrep + fuzzy search) and `/commands` (project, profile, plugins and built-ins). |
| 🖥️ **Raw terminal** | An xterm.js view of the tmux pane for TUI menus and anything the structured view does not cover. |
| 🤖 **Subagents** | Follow subagents and background tasks of a session. |
| 🚀 **Start & resume** | Start a new session in any project, or resume a read-only one. |
| 🌿 **Shared checkout warning** | Each session shows its git branch; sessions working in the same checkout are flagged, and a new one can start in its own git worktree. |
| 🔔 **Private push** | Notifications only to *your* registered phone, carrying no session content. Mute globally, per profile or per session. |

## How it works

```
┌──────────────┐  WebSocket over Tailscale   ┌─────────────────────────────────┐
│  phone app   │ ◄─────────────────────────► │  claude-remote daemon (computer)│
│ iOS / Android│       token-authenticated   │  ├─ tmux: send-keys / capture   │
└──────▲───────┘                             │  ├─ tails transcript .jsonl     │
       │ push (FCM, no content)              │  └─ HTTP hooks on 127.0.0.1     │
       └─────────────────────────────────────┤                                 │
                                             └───────────────┬─────────────────┘
                                                             │ hooks
                                          ┌──────────────────┴──────────────────┐
                                          │ tmux session "claude-remote"        │
                                          │  ├─ pessoal  → ~/.claude            │
                                          │  └─ trabalho → CLAUDE_CONFIG_DIR=…  │
                                          └─────────────────────────────────────┘
```

1. You start Claude Code with a tiny launcher (one per account, named by you, e.g. `pessoal`, `trabalho`) that runs it inside a tmux window.
2. Claude Code's HTTP hooks tell the daemon when a session starts, stops, needs permission or gets a prompt.
3. The daemon tails the session transcript, reads the tmux pane, and serves everything to the app over an authenticated WebSocket bound **only** to the Tailscale interface.
4. Prompts and keys go back through tmux; permission answers go back through the pending hook request.

Sessions started with plain `claude` (outside tmux) still show up — read-only — and can be resumed from the phone.

## Security model

The daemon is effectively a remote shell, so it is locked down by default:

- The WebSocket listens **only on the Tailscale interface** (100.64.0.0/10) — or `127.0.0.1` with an explicit `--dev`.
- Every connection must present a token (**Keychain** on macOS, the **Secret Service** via `secret-tool` or a `0600` file on Linux, **SecureStore** on the phone). `claude-remote rotate-token` invalidates it and drops all clients.
- The hooks endpoint listens **only on `127.0.0.1`** and requires a local shared secret.
- Push payloads carry **only** a title, profile and session id — never session content.
- `bypassPermissions` is never offered by the app.
- Edits to your files (`settings.json`, `~/.zshrc`, `~/.bashrc`) are merge → backup → atomic write, idempotent, and fully reverted by `claude-remote uninstall`.

See [SECURITY.md](SECURITY.md) to report a vulnerability.

## Requirements

- macOS, Linux (systemd recommended) or Windows 10 2004+/11 through WSL2, with `tmux`, `git`, `rg` (ripgrep), `zsh` and `claude` on the `PATH` (the installer adds the missing tools)
- Node 24+ (the one-line installer downloads a private Node into `~/.claude-remote/node` when it is missing; pnpm 12+ only for development)
- [Tailscale](https://tailscale.com) on the computer and the phone, signed in to the same tailnet (macOS: `brew install --cask tailscale`; Linux: `curl -fsSL https://tailscale.com/install.sh | sh` and `sudo tailscale up`)
- For the app (Expo Go is not enough: it uses native modules): Xcode on a Mac for the iOS development build, or Android Studio / the Android SDK (JDK 17) for Android 10+
- Optional, for push: a Firebase project (plus a paid Apple Developer account on iOS)

## Getting started

### 1. Computer (macOS or Linux): one-line install

```bash
curl -fsSL https://maarkn.dev/claude-remote/install.sh | bash
```

The installer checks the system (macOS or Linux) and Node, installs missing `tmux`/`ripgrep`/`zsh`/`git` (Homebrew on macOS; apt, dnf, pacman or zypper on Linux, with `sudo` after telling you why), puts the source in `~/.claude-remote/src`, builds the daemon and opens a guided setup (`claude-remote setup`) that:

- finds your Claude Code accounts (`~/.claude`, `~/.claude-*`) and lets you pick which ones to control, or creates a new one (makes the folder and opens Claude Code there so you log in);
- asks the **alias** of each one: the command that opens that account inside tmux (e.g. `pessoal`, `trabalho`);
- installs the launchers, the `PATH` entry and the hooks (with backups), and the background service;
- helps with Tailscale and shows the pairing QR code.

To update, run `claude-remote update` (or `--ref <branch|tag>`): it fetches the new version, rebuilds, refreshes the hooks and restarts the service, without the setup questions; the same as `bash -s -- --update` with the line above. `claude-remote setup` changes accounts and aliases later; `bash -s -- --yes` skips the questions.

<details>
<summary>Linux notes</summary>

- **Service**: a systemd user unit, `~/.config/systemd/user/claude-remote.service` (restarts on failure, logs in `~/.claude-remote/logs`). Check it with `claude-remote service status` or `systemctl --user status claude-remote`.
- **Lingering**: user services stop when you log out. The setup asks before running `loginctl enable-linger $USER`, which keeps the daemon running after logout and starts it at boot (needed on servers you reach over SSH).
- **No systemd** (containers, some WSL setups): the setup says so; run `claude-remote start` yourself, e.g. in a tmux window.
- **Token**: kept in the Secret Service (GNOME Keyring, KWallet…) through `secret-tool` when it is available, otherwise in `~/.claude-remote/token` (mode `0600`), which is what headless servers use. `claude-remote doctor` shows which one; `CLAUDE_REMOTE_TOKEN_STORE=secret-tool|file` forces it.
- **Shell**: the `PATH` entry goes to `~/.bashrc` and/or `~/.zshrc`; the launchers themselves run with `zsh`.

</details>

<details>
<summary>Windows (WSL2)</summary>

Claude Remote drives Claude Code through tmux, so on Windows it runs inside **WSL2** (Linux on Windows), where Claude Code is best supported too. In PowerShell:

```powershell
irm https://maarkn.dev/claude-remote/install.ps1 | iex
```

The script checks Windows 10 2004+ or Windows 11, installs WSL2 with Ubuntu when it is missing (Windows asks for administrator permission; reboot if asked, then run the same command again), helps create the Linux user, and then runs the Linux installer above inside the distribution. Options: `& ([scriptblock]::Create((irm https://maarkn.dev/claude-remote/install.ps1))) -Distro Ubuntu-24.04 -Ref main -Yes -NoService`.

- **Node and Claude Code** must be installed **inside WSL** (not only on Windows); the installer says what is missing.
- **systemd**: the background service is a systemd user unit, and WSL only boots systemd with `[boot] systemd=true` in `/etc/wsl.conf`. The setup shows the exact `sudo` command, runs it only if you agree (with a backup), and asks you to run `wsl --shutdown` from PowerShell.
- **Starting at logon**: WSL only runs while something uses it. The setup can create a Windows Scheduled Task, "Claude Remote", that starts the distribution when you log in (`schtasks.exe /Create /SC ONLOGON … /TR "wsl.exe -d <distro> --exec /bin/true"`); `claude-remote service uninstall` removes it. If WSL still stops when idle, raise `vmIdleTimeout` in `[wsl2]` of `%UserProfile%\.wslconfig`.
- **Tailscale**: WSL2 uses NAT by default, so a Tailscale running on Windows is not visible inside WSL. Either run Tailscale **inside WSL** (`curl -fsSL https://tailscale.com/install.sh | sh` and `sudo tailscale up`; works on any Windows), or keep it on Windows and turn on **mirrored networking** (Windows 11 22H2+): the setup can add `networkingMode=mirrored` to `[wsl2]` in `%UserProfile%\.wslconfig` (with a backup); then run `wsl --shutdown`.
- `claude-remote doctor` shows the distribution, the networking mode, systemd and the logon task.

</details>

<details>
<summary>Manual install (from a clone)</summary>

```bash
git clone https://github.com/maarkN/claude-remote.git
cd claude-remote
pnpm install
pnpm --filter @claude-remote/daemon build
node apps/daemon/dist/cli.js setup
```

</details>

Profiles and ports live in `~/.claude-remote/config.json`:

```json
{
  "profiles": [
    { "id": "pessoal", "name": "Personal", "configDir": "~/.claude", "color": "#D97757" },
    { "id": "trabalho", "name": "Work", "configDir": "~/.claude-work", "color": "#61AFEF" }
  ]
}
```

### 2. Phone: app

```bash
cd apps/mobile
pnpm ios             # expo run:ios — development build on the simulator or a connected iPhone
pnpm android         # expo run:android — development build on an emulator or a connected Android phone
pnpm build:android   # release APK built locally (eas.json also has development/preview/production profiles)
```

Open the app, scan the QR code from `claude-remote pair`, and you are in. Installed the app first? The pairing screen has a step-by-step guide for setting up the computer.

> **Trying it on the simulator without Tailscale?** Run `claude-remote start --dev` (binds to `127.0.0.1`) and `claude-remote pair --dev`. On the Android emulator also run `adb reverse tcp:7337 tcp:7337` so its `127.0.0.1` reaches the computer.

### 3. Use it

```bash
pessoal              # your alias; same arguments as `claude`
trabalho --resume    # another account
```

Both appear in the app, fully controllable. "Always allow" rules created from the phone: `claude-remote rules list` / `claude-remote rules undo <id>`.

**Two sessions in the same repository?** They edit the same files and can switch the branch under each other. The app marks live sessions that share a git checkout ("shared checkout"), and **New session** warns before starting in a busy one. Turn on **Isolated copy (git worktree)** to start Claude Code with `--worktree`: it works on its own branch in `<repo>/.claude/worktrees/<name>` and asks on exit whether to keep or remove it (needs a Claude Code with `--worktree`).

### Push notifications (optional)

1. In one Firebase project, create the apps you need with the id `tech.doctorx.clauderemote`: an iOS app (upload your APNs key) and/or an Android app.
2. Put `GoogleService-Info.plist` (iOS) and/or `google-services.json` (Android) in `apps/mobile/` (both git-ignored) and run `pnpm ios` / `pnpm android` again — Firebase is only linked on a platform when its file exists.
3. Save the Firebase service account to `~/.claude-remote/firebase-service-account.json` and restart the daemon. `claude-remote doctor` lists the phones registered for push and their platform.

On Android 13+ the app asks for the notification permission; notifications use the high-priority `claude-remote` channel (it can be tuned in the system settings) and, like on iOS, carry only the event and the profile.

### App updates over the air (optional)

Builds are created without an update server, so updates are off. To ship JavaScript changes without rebuilding on each phone, the app uses a self-hosted [Expo Updates](https://docs.expo.dev/technical-specs/expo-updates-1/) server — the one at `maarkn.dev` (no EAS account or fees), or any other implementation of the protocol.

1. **Signing key, once.** `cd apps/mobile && npx expo-updates codesigning:generate --key-output-directory ~/.claude-remote-keys --certificate-output-directory certs --certificate-validity-duration-years 10 --certificate-common-name "Claude Remote"`. Commit `certs/certificate.pem`; keep the private key out of the repo (and backed up: losing it means a new build for every phone).
2. **Build** with the server URL, e.g. in `apps/mobile/.env.local` (git-ignored, read by the build and the publisher):
   ```dotenv
   CLAUDE_REMOTE_UPDATES_URL=https://maarkn.dev/api/claude-remote/updates/manifest
   ```
   A custom URL without `certs/certificate.pem` is refused. (`EAS_PROJECT_ID=<id>` uses EAS Update instead; code signing there needs a paid plan.)
3. **Publish** a JavaScript change:
   ```bash
   CLAUDE_REMOTE_UPDATES_TOKEN=… CLAUDE_REMOTE_UPDATES_KEY=~/.claude-remote-keys/private-key.pem \
     pnpm --filter @claude-remote/mobile ota:publish          # --platform ios|android, --dry-run
   ```
   It runs `expo export`, signs one manifest per platform locally and uploads only the files the server does not have yet. The token is the server's `CLAUDE_REMOTE_UPDATES_TOKEN`.

**Channels.** Builds follow `production`, published by hand (`make publish-ota`, or `CHANNEL=…`). Every merge into `development` that touches the app is published to the `development` channel by the *OTA (development)* workflow; **Settings → App → channel** switches a phone to it (and back). The workflow needs two repository secrets: `OTA_SIGNING_KEY` (the private key PEM) and `OTA_DEV_TOKEN` (the server's `CLAUDE_REMOTE_UPDATES_DEV_TOKEN`, which can only publish to `development`). Without them it does nothing. If builds pin `APPLE_TEAM_ID`, set the same value as the repository variable `APPLE_TEAM_ID` (it is part of the runtime version).

The app checks at launch and when it returns to the foreground, downloads in the background and applies the update the next time it opens; **Settings → App** shows what is running and has *Check for updates*. Updates only reach builds with the same native code (fingerprint runtime version): a release that adds native modules still needs a new build.

### Uninstall

```bash
claude-remote service uninstall
claude-remote uninstall   # removes launchers, the PATH block in ~/.zshrc / ~/.bashrc and only the hooks it created
```

## Tech stack

| Area | Tools |
|---|---|
| Monorepo | pnpm workspaces, Turborepo, TypeScript (strict), Biome, Vitest |
| Protocol | Zod schemas shared by daemon and app — single source of truth |
| Daemon | Node 24, `ws`, Fastify, Pino, Commander, execa, chokidar, fuzzysort, firebase-admin, tsup |
| App | Expo SDK 57, React Native, Expo Router, Zustand, TanStack Query, FlashList, react-native-marked, xterm.js (WebView), expo-secure-store, expo-camera, React Native Firebase |
| Planning | [OpenSpec](https://github.com/Fission-AI/OpenSpec) — every feature started as a numbered change with specs and tasks |

## Project structure

```
apps/daemon        Node daemon: WebSocket for the app, HTTP for hooks, tmux, transcripts, push
apps/mobile        Expo app (Expo Router, feature folders, terminal-style dark theme)
packages/protocol  Zod schemas + types of the WebSocket protocol
openspec/          Specs and the 20 archived changes that built the project
.docs/             Original product requirements document (Portuguese)
```

Architecture and conventions are documented in [CLAUDE.md](CLAUDE.md).

## Development

`make` lists shortcuts for the commands below: `make install`, `make check`, `make daemon-dev`, `make ios-dev` / `make android-dev` (development builds), `make install-ios` / `make install-android` (release build on a connected phone or iPad, `DEVICE="…"` to choose it; `install-ios` first checks that Xcode can reach the iPhone and `make ios-devices` lists them; with several Apple teams on the Mac, set `APPLE_TEAM_ID=…` in `apps/mobile/.env.local` so builds are always signed by the same one) and `make publish-ota` (`CHANNEL=production|development`, `PLATFORM=ios|android`, key in `OTA_KEY`, default `~/.claude-remote-keys/private-key.pem`; token in `CLAUDE_REMOTE_UPDATES_TOKEN`). `make publish-ota-dry` exports and signs without uploading.

```bash
pnpm check                                             # typecheck + tests + Biome across the monorepo
pnpm --filter @claude-remote/daemon dev start --dev    # daemon from source on 127.0.0.1
pnpm --filter @claude-remote/mobile icons              # regenerate icon/splash
pnpm --filter @claude-remote/mobile xterm              # regenerate the terminal HTML
```

## Limitations

- The daemon runs on macOS, Linux and Windows through WSL2; the app runs on iOS and Android 10+ (built locally or with EAS, not published to the stores yet). On Android the Allow/Deny buttons are not shown on the notification: tap it to answer in the app.
- Sessions must run inside tmux to be controllable; others are read-only until resumed.
- Permission-mode switching reads the Claude Code status line, so a TUI change may need a label update (they live in one tested table).
- The UI is in Brazilian Portuguese for now — translations are welcome.

## Contributing

Issues and pull requests are welcome! Read [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow (OpenSpec, Conventional Commits, `pnpm check`).

## License

[MIT](LICENSE) © Marco Filho

<sub>Claude Remote is an independent project and is not affiliated with, endorsed by or sponsored by Anthropic. "Claude" and "Claude Code" are trademarks of Anthropic, PBC.</sub>
