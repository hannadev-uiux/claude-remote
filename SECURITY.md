# Security Policy

Remote Harness's daemon can type into your Claude Code sessions and approve tool calls — it is effectively a remote shell on your Mac. Security reports are taken seriously.

## Reporting a vulnerability

**Please do not open a public issue.** Report privately through [GitHub Security Advisories](https://github.com/maarkN/remote-harness/security/advisories/new) with:

- a description of the issue and its impact;
- steps to reproduce (versions of macOS, Node, Claude Code and the app);
- any suggested fix.

You can expect an acknowledgement within a few days. Once fixed, the advisory is published with credit, unless you prefer to stay anonymous.

## Supported versions

Only the latest release on `main` receives security fixes.

## Security model (summary)

- WebSocket bound only to the Tailscale interface (or `127.0.0.1` with `--dev`), token required on every connection; token stored in the macOS Keychain and in iOS SecureStore.
- Hooks endpoint bound only to `127.0.0.1`, protected by a local shared secret.
- Push notifications never include session content.
- `bypassPermissions` is never offered by the app.

Out of scope: attacks that require an already compromised Mac or tailnet, or exposing the daemon outside Tailscale via `--host`.
