## 1. Core

- [x] 1.1 Create the `src/{core,infra,features,transport}` structure and `main.ts`; verify with `pnpm --filter daemon typecheck`
- [x] 1.2 Implement the pino logger and the typed event bus; verify with a unit test of the bus
- [x] 1.3 Implement loading/creating `config.json` with Zod and default profiles, ignoring a nonexistent `configDir`; verify with tests for first run, invalid file and missing directory

## 2. Security

- [x] 2.1 Implement token storage in the Keychain (`security`) and token generation; verify with a test using a fake executor
- [x] 2.2 Implement Tailscale IP discovery and `--dev` mode; verify with an interface-filter test

## 3. Transport

- [x] 3.1 Implement `ws-server` with the `auth` handshake (5 s timeout, version check, timingSafeEqual) and the message router; verify with an integration test using a `ws` client
- [x] 3.2 Implement the Fastify `hooks-server` on 127.0.0.1 with the secret; verify with an `inject` test returning 401 without the secret

## 4. CLI

- [x] 4.1 Implement the `claude-remote` CLI (`start`, `pair`, `rotate-token`, `doctor`) with commander and a QR in the terminal; verify by running `pnpm --filter daemon dev -- pair --dev`
