## Why

Every Claude Remote function depends on a process on the Mac that knows the profiles, accepts only authorized clients and exposes the WebSocket and the hooks endpoint. It is the foundation of M0/M1 (requirements D1 and D6).

## What Changes

- Node/TypeScript daemon in `apps/daemon` with explicit module composition.
- Configuration file `~/.claude-remote/config.json` with profiles (name, `CLAUDE_CONFIG_DIR`, color), ports and the default scope of "always allow".
- Pairing token stored in the macOS Keychain; `pair` (shows a QR with address + token) and `rotate-token` commands.
- WebSocket server bound only to the Tailscale IP (or `127.0.0.1` in dev mode) with an `auth` handshake.
- Hooks HTTP server bound only to `127.0.0.1`, protected by a local secret.
- `claude-remote` CLI (`start`, `pair`, `rotate-token`, `doctor`).

## Capabilities

### New Capabilities
- `daemon-config`: configurable profiles and daemon configuration.
- `daemon-auth`: token authentication, network interface restriction and pairing.

### Modified Capabilities

## Impact

New `apps/daemon` app. Dependencies: `ws`, `fastify`, `zod`, `pino`, `commander`, `qrcode-terminal`, `execa`.
