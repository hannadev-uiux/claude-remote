---
title: Documentation
description: How to install, pair, use and troubleshoot Remote Harness.
---

Remote Harness lets you follow and drive Claude Code sessions that run in tmux on your own computer, from your phone, over your Tailscale network. These pages cover the user side; the code, the architecture and the specifications live in the [repository](https://github.com/maarkN/remote-harness).

## Pages

- [Getting started](/en/docs/getting-started/): requirements, the one-line install on macOS, Linux and Windows (WSL2), the app, pairing.
- [Using the app](/en/docs/using-the-app/): session list, conversation, prompts, permissions, terminal, sessions and worktrees, live status, notifications, profiles and OpenRouter, settings.
- [The daemon](/en/docs/daemon/): CLI commands, the configuration file, the background service, updates and channels, the tray icon, logs.
- [Security & privacy](/en/docs/security/): what the daemon can do, what leaves your machine, tokens and keys, reporting a problem.
- [Troubleshooting](/en/docs/troubleshooting/): connection, Tailscale, push, sleep, read-only sessions, WSL, version mismatch.
- [Contributing](/en/docs/contributing/): how the project is built and how to help.

## Quick start

1. On the computer: `curl -fsSL https://remoteharness.app/install | bash` (Windows: `irm https://remoteharness.app/install | iex` in PowerShell).
2. Install the app and Tailscale on the phone, then scan the QR code the setup shows at the end.
3. Run your alias (for example `work`) instead of `claude`. The session appears on the phone, fully controllable.
