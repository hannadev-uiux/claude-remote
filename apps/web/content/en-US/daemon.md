---
title: The daemon
description: CLI commands, the configuration file, the background service, updates and channels, the tray icon, logs.
applies: 0.7+
---

The daemon runs on the computer: it tails the session transcripts, drives tmux, receives Claude Code's hooks on `127.0.0.1` and serves the app over a WebSocket bound to the Tailscale interface. `remote-harness --help` is the source of truth for the commands.

## Commands

| Command | What it does |
| --- | --- |
| `remote-harness setup` | Guided setup: accounts and aliases, hooks, service, pairing. `--yes` keeps the config, `--lang` picks the language. |
| `remote-harness start` | Runs the daemon in the foreground. `--dev` binds to `127.0.0.1`, `--host` sets the address, `--wait-tailscale` waits for the interface. |
| `remote-harness pair` | Shows the pairing QR code (address and token). `--dev` for `127.0.0.1`. |
| `remote-harness rotate-token` | New token; every phone has to pair again. |
| `remote-harness doctor` | Checks the tools, Tailscale, the config, the profiles and their provider keys, the token store, the service, push and the registered phones. |
| `remote-harness install` / `uninstall` | Installs or removes the launchers, the `PATH` entry, the hooks and the status line wrapper, without questions. |
| `remote-harness service install` / `uninstall` / `status` | The background service: a launchd LaunchAgent on macOS, a systemd user unit on Linux and WSL. |
| `remote-harness update` | Fetches the new version, rebuilds, refreshes the hooks and restarts the service. `--ref <branch|tag>` picks a version. |
| `remote-harness updates status` / `check` / `channel [main|development]` / `auto on|off` | The background update check. |
| `remote-harness push status` / `test` | Push mode in use and the registered phones; sends a test notification. |
| `remote-harness push off` / `on` | Stops (or resumes) every push and live status update from this computer, without restarting the daemon. |
| `remote-harness provider key <profile>` | Stores a profile's provider key (OpenRouter) in the OS secret store. `--stdin` reads it from a pipe. |
| `remote-harness rules list` / `undo <id>` | The "always allow" rules created from the phone. |

The old `claude-remote` command and `CLAUDE_REMOTE_*` variables keep working for installs made before the rename.

## Configuration file

`~/.remote-harness/config.json` (installs made before the rename keep using `~/.claude-remote`):

```json
{
  "profiles": [
    { "id": "personal", "name": "Personal", "configDir": "~/.claude", "color": "#D97757" },
    { "id": "work", "name": "Work", "configDir": "~/.claude-work", "color": "#61AFEF" }
  ],
  "wsPort": 7337,
  "hookPort": 7338,
  "defaultRuleScope": "project",
  "permissionTimeoutSec": 280,
  "questionTimeoutSec": 3300,
  "inputStrategy": "paste",
  "recentDays": 7,
  "tmuxSession": "claude-remote",
  "push": "auto",
  "update": { "channel": "main", "auto": false },
  "tray": true
}
```

- `profiles`: one per Claude Code account. `id` is the alias (the launcher's name), `configDir` the account's `CLAUDE_CONFIG_DIR`, `color` the tag color in the app. Optional `agent` (`claude` by default) and `provider` (below).
- `wsPort`, `hookPort`: the app and the hooks ports.
- `defaultRuleScope`: where "always allow" rules go by default, `project` or `user`.
- `permissionTimeoutSec`: how long the daemon holds a permission request for the phone before the terminal dialog takes over. The request stays in the app as "Answer in the terminal" until the session moves on.
- `questionTimeoutSec`: the same for questions and plan approvals (3300 by default). A question still open after 10 minutes sends one reminder push. The hook timeout written into the agent's settings covers both, and `remote-harness install` or `update` rewrites it.
- `inputStrategy`: `paste` (default) or `type` for prompts sent from the phone.
- `recentDays`: how far back ended sessions are listed.
- `tmuxSession`: the tmux session the launchers use.
- `language`: `pt-BR`, `en-US` or `es-ES` for the CLI, the setup and the push texts; the system language when absent.
- `push`: `auto` (your Firebase service account when present, else the relay) or `off`.
- `update`: the channel `update` and the background check follow, and whether updates apply by themselves.
- `tray`: the menu bar / tray icon.
- `trayPermissions`: whether the tray offers Allow / Always allow / Deny for a waiting permission (on by default; also under the tray's Preferences).

Edits to the file take effect when the daemon restarts (`remote-harness service install` again, or restart from the tray).

## Profiles and OpenRouter

A profile can route Claude Code through OpenRouter instead of the Anthropic account. The easiest way is `remote-harness setup` → "Add an OpenRouter profile": it asks the name, the alias, the folder (`~/.claude-openrouter`), an optional default model and the key (hidden), checks the key with OpenRouter and shows the credits left when the key can read them. Running the setup again lists these profiles and lets you keep them, replace the key or remove the profile (its launcher, hooks and key; the folder stays).

By hand: add a `provider` with `kind: "openrouter"` and, optionally, `baseUrl` (another Anthropic-compatible gateway), a default `model` and a `smallFastModel`.

```json
{
  "id": "openrouter",
  "name": "OpenRouter",
  "configDir": "~/.claude-openrouter",
  "color": "#8A8784",
  "provider": { "kind": "openrouter", "model": "anthropic/claude-sonnet-5.5" }
}
```

Then `remote-harness install` regenerates the launchers and `remote-harness provider key openrouter` stores the key in the same place as the pairing token (Keychain on macOS, Secret Service or a `0600` file on Linux). The launcher reads it only inside the tmux window, never on a command line, and the daemon only uses it to show your credits in the app. `doctor` reports whether each provider profile has a key.

## Codex profiles

A profile can run OpenAI Codex CLI instead of Claude Code: set `"agent": "codex"` and point `configDir` at the Codex home (`CODEX_HOME`, `~/.codex` by default). `remote-harness setup` offers `~/.codex` when Codex has used it.

```json
{ "id": "cdx", "name": "Codex", "configDir": "~/.codex", "color": "#2FBF8F", "agent": "codex" }
```

`remote-harness install` writes the profile's launcher (it opens `codex` with `CODEX_HOME` set) and merges the daemon's hooks into `<CODEX_HOME>/hooks.json`, next to your own and with a backup; your `config.toml` is not touched. **Codex asks once to trust new hooks**: open `codex` and choose "Trust all and continue" (or review them in `/hooks`). Until then its sessions are listed read-only and approvals stay in the terminal. `doctor` checks that `codex` is on the `PATH` and that the hooks are installed.

What works like Claude Code: the session list (recent rollouts under `sessions/`), the conversation, prompts, photos and keys, starting and resuming from the phone, push, live status and approvals with Allow / Deny. Differences: the mode chip shows the approval policy and changes only with `/permissions` in the terminal, there is no "Always" (Codex hooks cannot add rules), no worktree option and no provider.

## Launchers and aliases

Each profile gets a small zsh launcher in `~/.remote-harness/bin/<alias>` (added to the `PATH` of `~/.zshrc` and `~/.bashrc`). Run the alias instead of `claude`, with the same arguments: it opens Claude Code in a window of the `claude-remote` tmux session with the right `CLAUDE_CONFIG_DIR` and attaches your terminal to it. The plain `claude` command is never changed.

## Background service

`remote-harness service install` keeps the daemon running after you close the terminal and starts it at login: a LaunchAgent on macOS (shown as a Login Item), a systemd user unit on Linux (`~/.config/systemd/user/claude-remote.service`). On Linux servers you reach over SSH, the setup offers `loginctl enable-linger`, so the service survives logout. Without systemd (containers, some WSL setups) run `remote-harness start` yourself, for example in a tmux window. On WSL the setup can also create a Windows scheduled task that starts the distribution at logon.

`remote-harness service status` shows whether it is loaded; the tray menu can restart it.

## Updates and channels

The service checks its channel on the git remote every 6 hours and shows a desktop notification when there is a new version (never in a development clone). `remote-harness update` applies it; `remote-harness updates auto on` lets the daemon update by itself, only when no session is running or waiting and no permission is pending, and never to an older version. `remote-harness updates channel development` follows the integration branch; going back to `main` warns that it installs an older version.

## Tray icon

The service daemon shows a menu bar icon on macOS (a small Swift helper built on first start with the Command Line Tools) and a tray icon on Linux (`python3` with GTK 3 and AyatanaAppIndicator3 or AppIndicator3). The menu shows the running sessions and the pending permissions (answer them from there), starts a new session, shows the pairing code, checks or applies updates, picks the channel, opens the logs, the config and the documentation, and restarts the daemon. **Pair a phone** shows the pairing QR code right in the menu on macOS, the address, the pairing in the terminal and **Rotate token…** (the paired phones must pair again). **Preferences** toggles the permission answers in the menu, the keep-awake mode and push notifications, applied at once, and opens the config file for the rest. Under the service, **Quit** either hides the icon or stops the service until the next login. `"tray": false` turns it off; without the helper, and in WSL, the daemon runs headless.

## Data and logs

Everything the daemon keeps lives in `~/.remote-harness/`: `config.json`, `state.json` (the known sessions), `secrets/` (provider keys when the file store is used), `models-cache.json`, `bin/` (launchers), `logs/` and `src/` (the source the installer built). Attach the logs to a bug report after removing tokens and session content.

Environment variables: `REMOTE_HARNESS_HOME` moves the data directory, `REMOTE_HARNESS_TOKEN_STORE=keychain|secret-tool|file` forces the token store, `REMOTE_HARNESS_LANG` sets the language.
