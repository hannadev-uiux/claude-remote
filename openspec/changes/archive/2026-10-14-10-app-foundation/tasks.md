## 1. Projeto

- [x] 1.1 Criar app Expo com Expo Router, TypeScript estrito, `expo-dev-client` e config do monorepo no Metro; verificar com `pnpm --filter mobile typecheck` e `npx expo export --platform ios`
- [x] 1.2 Criar tokens de tema, fontes JetBrains Mono e componentes base de UI (`Screen`, `Text`, `Button`, `Badge`, `Card`, `IconButton`); verificar com typecheck

## 2. Ícone

- [x] 2.1 Desenhar `icon.svg` e script `pnpm icons` que gera `icon.png`, `splash.png` e `adaptive-icon.png`; verificar visualmente o PNG gerado

## 3. Conexão

- [x] 3.1 Implementar `DaemonClient` com handshake, requests com timeout, backoff e eventos; verificar com testes Vitest usando WebSocket falso
- [x] 3.2 Implementar store de conexão (Zustand), provider React e banner de status; verificar com typecheck e teste do store
- [x] 3.3 Configurar layout raiz com redirecionamento para pareamento sem credenciais; verificar com `expo export`
