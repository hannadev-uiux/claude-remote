## 1. Núcleo

- [x] 1.1 Criar estrutura `src/{core,infra,features,transport}` e `main.ts`; verificar com `pnpm --filter daemon typecheck`
- [x] 1.2 Implementar logger pino e event bus tipado; verificar com teste unitário do bus
- [x] 1.3 Implementar carga/criação de `config.json` com Zod e perfis padrão, ignorando `configDir` inexistente; verificar com testes de primeira execução, inválido e diretório ausente

## 2. Segurança

- [x] 2.1 Implementar armazenamento de token no Keychain (`security`) e geração de token; verificar com teste usando executor falso
- [x] 2.2 Implementar descoberta do IP Tailscale e modo `--dev`; verificar com teste de filtro de interfaces

## 3. Transporte

- [x] 3.1 Implementar `ws-server` com handshake `auth` (timeout 5 s, checagem de versão, timingSafeEqual) e router de mensagens; verificar com teste de integração usando cliente `ws`
- [x] 3.2 Implementar `hooks-server` Fastify em 127.0.0.1 com segredo; verificar com teste `inject` retornando 401 sem segredo

## 4. CLI

- [x] 4.1 Implementar CLI `claude-remote` (`start`, `pair`, `rotate-token`, `doctor`) com commander e QR no terminal; verificar rodando `pnpm --filter daemon dev -- pair --dev`
