## Context

See proposal.md. First runtime code of the daemon.

## Goals / Non-Goals

**Goals:** a modular skeleton into which each subsequent feature plugs without touching the others.

**Non-Goals:** launchd (change 20), TLS (Tailscale already encrypts the traffic with WireGuard).

## Decisions

- **Layered, per-feature architecture**: `src/core` (config, logger, keychain, events), `src/infra` (tmux, fs), `src/features/<feature>` (sessions, transcript, input, permissions, mode, autocomplete, pane, push), `src/transport` (ws-server, hooks-server). `src/main.ts` does the composition (manual constructor DI), with no DI framework.
- **Typed event bus** (our own `mitt`-like, ~30 lines) to decouple features from transport: features emit domain events; the `ws-server` translates them into protocol messages.
- **Message router**: a `type → handler` map registered by the features (`registerHandler`), with validation by the protocol package before reaching the handler.
- **Fastify** for the hooks HTTP server (validation, integrated pino logs). **ws** for the WebSocket (separate server, its own port), as it is the stable standard in Node.
- **Keychain via the `security` CLI** (`execa`), avoiding native modules (`keytar` is abandoned).
- **Tailscale discovery**: `os.networkInterfaces()` filtering 100.64.0.0/10; the `--dev` flag binds to 127.0.0.1 (useful with the simulator).
- **Hooks secret**: generated and saved in `~/.claude-remote/hook-secret` (permission 0600), sent in the `X-Claude-Remote-Secret` header. Local endpoint only; acceptable risk.
- **Token comparison** with `crypto.timingSafeEqual`.
- Default ports: WS 7337, hooks 7338.

## Risks / Trade-offs

- [Tailscale IP changes] → the QR uses the current IP; the app allows editing the host; MagicDNS can be entered manually.
- [Keychain asks for interactive permission] → `security add-generic-password -U` with `-A` restricted to the user; fallback documented in `doctor`.
