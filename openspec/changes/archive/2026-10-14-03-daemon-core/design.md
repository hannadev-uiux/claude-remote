## Context

Ver proposal.md. Primeiro código de runtime do daemon.

## Goals / Non-Goals

**Goals:** esqueleto modular onde cada feature seguinte se pluga sem mexer nas outras.

**Non-Goals:** launchd (change 20), TLS (Tailscale já cifra o tráfego WireGuard).

## Decisions

- **Arquitetura em camadas por feature**: `src/core` (config, logger, keychain, eventos), `src/infra` (tmux, fs), `src/features/<feature>` (sessions, transcript, input, permissions, mode, autocomplete, pane, push), `src/transport` (ws-server, hooks-server). `src/main.ts` faz a composição (DI manual por construtor), sem framework de DI.
- **Event bus tipado** (`mitt`-like próprio, ~30 linhas) para desacoplar features do transporte: features emitem eventos de domínio; o `ws-server` traduz para mensagens do protocolo.
- **Router de mensagens**: mapa `type → handler` registrado pelas features (`registerHandler`), com validação pelo pacote de protocolo antes de chegar ao handler.
- **Fastify** para o HTTP de hooks (validação, logs pino integrados). **ws** para o WebSocket (servidor separado, porta própria) por ser o padrão estável em Node.
- **Keychain via CLI `security`** (`execa`), evitando módulos nativos (`keytar` está abandonado).
- **Descoberta Tailscale**: `os.networkInterfaces()` filtrando 100.64.0.0/10; flag `--dev` liga em 127.0.0.1 (útil com simulador).
- **Segredo dos hooks**: gerado e salvo em `~/.claude-remote/hook-secret` (permissão 0600), enviado no header `X-Claude-Remote-Secret`. Endpoint local apenas; risco aceitável.
- **Comparação de token** com `crypto.timingSafeEqual`.
- Portas padrão: WS 7337, hooks 7338.

## Risks / Trade-offs

- [IP Tailscale muda] → o QR usa o IP atual; o app permite editar host; MagicDNS pode ser informado manualmente.
- [Keychain pede permissão interativa] → `security add-generic-password -U` com `-A` restrito ao próprio usuário; fallback documentado no `doctor`.
