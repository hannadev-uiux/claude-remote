## Why

Todas as funções do Claude Remote dependem de um processo no Mac que conheça os perfis, aceite só clientes autorizados e exponha o WebSocket e o endpoint de hooks. É a base do M0/M1 (requisitos D1 e D6).

## What Changes

- Daemon Node/TypeScript em `apps/daemon` com composição explícita de módulos.
- Arquivo de configuração `~/.claude-remote/config.json` com perfis (nome, `CLAUDE_CONFIG_DIR`, cor), portas e escopo padrão do "permitir sempre".
- Token de pareamento guardado no Keychain do macOS; comandos `pair` (mostra QR com endereço + token) e `rotate-token`.
- Servidor WebSocket ligado apenas ao IP Tailscale (ou `127.0.0.1` em modo dev) com handshake `auth`.
- Servidor HTTP de hooks ligado apenas a `127.0.0.1`, protegido por segredo local.
- CLI `claude-remote` (`start`, `pair`, `rotate-token`, `doctor`).

## Capabilities

### New Capabilities
- `daemon-config`: perfis configuráveis e configuração do daemon.
- `daemon-auth`: autenticação por token, restrição de interface de rede e pareamento.

### Modified Capabilities

## Impact

Novo app `apps/daemon`. Dependências: `ws`, `fastify`, `zod`, `pino`, `commander`, `qrcode-terminal`, `execa`.
