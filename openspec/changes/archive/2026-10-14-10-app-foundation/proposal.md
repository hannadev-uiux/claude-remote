## Why

O app precisa de uma base sólida antes das telas: navegação, tema visual, cliente WebSocket resiliente e ícone (A6).

## What Changes

- App Expo (SDK atual, development build iOS) em `apps/mobile` com TypeScript estrito e Expo Router.
- Tema dark inspirado no terminal do Claude Code: fundo quase preto, texto claro, laranja Claude (`#D97757`) como cor de destaque, fonte monoespaçada (JetBrains Mono).
- Ícone do app: o símbolo do Claude Code sobre um terminal com o prompt `>_` ao fundo, gerado em SVG e exportado para PNG (ícone e splash).
- Cliente WebSocket com autenticação, fila de requisições com `id`, reconexão com backoff exponencial e reassinatura com cursor.
- Estado global com Zustand e cache de requisições com TanStack Query.
- Estrutura feature-based.

## Capabilities

### New Capabilities
- `app-shell`: base do app (tema, navegação, conexão resiliente com o daemon).

### Modified Capabilities

## Impact

Novo app `apps/mobile`. Dependências: `expo`, `expo-router`, `zustand`, `@tanstack/react-query`, `@shopify/flash-list`, `@expo-google-fonts/jetbrains-mono`, `lucide-react-native`, `react-native-svg`, `expo-haptics`.
