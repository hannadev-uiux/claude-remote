---
title: Security & privacy
description: What the daemon can do, what leaves your machine, tokens and keys, and how to report a problem.
applies: 0.7+
---

## What the daemon can do

The daemon can type into your Claude Code sessions and approve tool calls, so it is effectively a remote shell on your computer. It is locked down by default and nothing in it is reachable from the internet.

## Network

- The WebSocket the app connects to listens **only on the Tailscale interface** (100.64.0.0/10), or on `127.0.0.1` with an explicit `--dev`. There is no port on the internet and no relay server reading your sessions.
- Claude Code's hooks reach the daemon on `127.0.0.1` only, with a local shared secret.
- Exposing the daemon outside Tailscale with `--host` is out of scope and not supported.

## Tokens and keys

- Every connection presents a pairing token kept in the macOS Keychain, the Linux Secret Service (`secret-tool`) or a `0600` file, and in the phone's secure storage. `remote-harness rotate-token` invalidates it and drops every client.
- Provider keys (OpenRouter) live in the same store, under their own account. They are never written to `config.json`, `settings.json`, shell files or the launchers, never logged, and never sent to the phone: the launcher reads the key inside the tmux window, and the daemon only uses it to ask the provider for your credits.

## What leaves your machine

- Push notifications carry a title, the profile and the session id. The live status adds the session name, the folder, the state and the step category. Never the conversation.
- With the push relay, the relay sees those same content-free messages and a sealed grant (your FCM token); it stores nothing. With your own Firebase project, nothing goes through anyone else.
- The daemon sends no telemetry. The update check talks to the git remote of the installed source.
- The OpenRouter catalog and credits requests go from the computer to OpenRouter, nowhere else.

## Permissions

The app never offers the agent's "bypass permissions" mode. "Always allow" writes a rule in Claude Code's own settings, for the project or for your user, and `remote-harness rules undo` reverts it. An unanswered request falls back to the terminal dialog after a few minutes.

## Your files

The installer edits `settings.json`, `~/.zshrc` and `~/.bashrc` the same way every time: read, merge, back up, write atomically. `remote-harness uninstall` removes exactly what it added. The plain `claude` command is never changed.

## Reporting a vulnerability

Please do not open a public issue. Report privately through [GitHub Security Advisories](https://github.com/maarkN/remote-harness/security/advisories/new) with a description, the impact, steps to reproduce (versions of the OS, Node, Claude Code and the app) and any suggested fix. You can expect an acknowledgement within a few days; once fixed, the advisory is published with credit unless you prefer to stay anonymous. Only the latest release on `main` receives security fixes. The full policy is in [SECURITY.md](https://github.com/maarkN/remote-harness/blob/main/SECURITY.md).
