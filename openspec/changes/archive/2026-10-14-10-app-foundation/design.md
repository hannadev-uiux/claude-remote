## Context

Expo Go não carrega `@react-native-firebase`; o app usa development build desde o início (`expo-dev-client`).

## Goals / Non-Goals

**Goals:** camadas claras: `app/` (rotas finas), `src/features/*` (telas, componentes e hooks por feature), `src/core/*` (conexão, storage, tema, utilidades), `src/ui/*` (componentes de design system).

**Non-Goals:** Android, tablets, tema claro.

## Decisions

- **Expo Router** (rotas tipadas). Grupo `(main)` protegido; `pair` fora dele.
- **`DaemonClient`** (classe sem React, em `src/core/connection`): máquina de estados `idle → connecting → authenticating → open → reconnecting`, `request<T>(msg)` com `id` (nanoid) e timeout, `on(type, handler)`. Testável com Vitest e WebSocket falso.
- **Zustand** para estado de conexão, sessões e transcripts (stores por feature, com seletores). **TanStack Query** para requisições pontuais (`files.search`, `commands.list`). Combinação recomendada atualmente: Zustand para estado vivo vindo do socket, Query para request/response.
- **Estilo**: `StyleSheet` + tokens tipados em `src/core/theme` (cores, espaçamento, tipografia). Sem lib de estilos para reduzir risco de build; tokens centralizados mantêm consistência.
- **Paleta**: fundo `#0D0D0D`, superfície `#161616`, borda `#2A2A2A`, texto `#E8E6E3`, texto secundário `#8A8784`, destaque `#D97757`, sucesso `#7FB069`, erro `#E06C75`, aviso `#E5C07B`, info `#61AFEF`.
- **Ícone**: SVG próprio em `assets/icon/icon.svg` (asterisco/estrela do Claude em laranja sobre janela de terminal escura com `>_`) convertido para PNG 1024 com `sharp` num script `pnpm icons`.
- **AppState**: reconexão imediata ao voltar ao primeiro plano.

## Risks / Trade-offs

- [Metro + pnpm] → `node-linker=hoisted` e `metro.config.js` com `watchFolders` do monorepo.
