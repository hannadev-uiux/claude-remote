## Why

Acompanhar e responder a sessão é o principal uso do app (A3, A4).

## What Changes

- Tela da sessão com mensagens do usuário e do Claude em markdown, blocos de pensamento recolhidos, tool calls recolhíveis com resumo (ex.: `Bash(pnpm test)`), resultados e diffs coloridos para `Edit`/`Write`.
- Carregamento de histórico ao rolar para cima.
- Campo de prompt com envio, botões Esc e Ctrl+C (com confirmação) e atalhos de teclas.
- Cabeçalho com perfil, diretório e estado.

## Capabilities

### New Capabilities
- `app-conversation`: visualização da conversa e envio de entrada pelo app.

### Modified Capabilities

## Impact

`src/features/conversation`; dependências `react-native-markdown-display` (fork mantido `@ronradtke/react-native-markdown-display`), `diff`.
