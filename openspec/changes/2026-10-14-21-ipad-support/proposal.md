## Why

O app hoje trava a UI no formato de iPhone: `app.config.ts` define `supportsTablet: false` e `orientation: 'portrait'`, e o `design.md` da fundação (`openspec/changes/archive/2026-10-14-10-app-foundation`) lista tablets como non-goal explícito. No iPad isso roda em modo compatibilidade (upscale de iPhone), com uma pilha de navegação de tela única, barra de sugestões pensada para teclado virtual e nenhuma affordance de ponteiro/trackpad ou teclado externo — mesmo sendo exatamente o tipo de dispositivo (tela grande, teclado físico comum) onde acompanhar sessões longas do Claude Code é mais confortável.

## What Changes

- `app.config.ts`: `supportsTablet: true`; orientação retrato-apenas no iPhone e livre (retrato + paisagem) no iPad, via chaves nativas `UISupportedInterfaceOrientations` / `UISupportedInterfaceOrientations~ipad` no `Info.plist` (sem nova dependência JS).
- Navegação adaptativa por classe de largura: em largura compacta (iPhone, ou iPad em Slide Over/Split View estreito) mantém a pilha atual, tela a tela; em largura regular (iPad em tela cheia ou Split View largo, em retrato ou paisagem) passa a mestre-detalhe — lista de sessões fixa à esquerda e a tela ativa (conversa, nova sessão, configurações, terminal, subagente) no painel de detalhe.
- Affordances de ponteiro/trackpad (hover em itens de lista e botões) e atalhos de teclado externo no nível do shell: nova sessão, configurações, navegar sessões, fechar painel de detalhe.
- Lista de sessões indica visualmente a sessão aberta no painel de detalhe quando em mestre-detalhe, e aceita navegação por setas/Enter do teclado.
- Conversa: atalho de teclado externo para enviar o prompt (Cmd+Enter) sem perder o comportamento atual do botão de envio; largura de leitura do conteúdo (texto, diffs, tool calls) limitada dentro do painel de detalhe em telas muito largas, em vez de esticar borda a borda.
- Autocomplete: a barra de sugestões deixa de assumir que o teclado virtual está sempre visível (teclado externo conectado) e se ancora corretamente ao campo de prompt também no layout mestre-detalhe.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-shell`: navegação adaptativa por classe de largura/orientação (mestre-detalhe no iPad), affordances de ponteiro e atalhos de teclado externo no shell, comportamento em multitarefa (Split View/Slide Over).
- `app-session-list`: a lista sinaliza a sessão selecionada quando exibida como painel mestre e aceita navegação por teclado.
- `app-conversation`: atalho de teclado externo para enviar o prompt e largura de leitura limitada em painéis largos.
- `autocomplete`: posicionamento das sugestões deixa de depender da presença do teclado virtual.

## Impact

- `apps/mobile/app.config.ts`: `supportsTablet`, orientação por idioma (plist keys por idiom, mesmo padrão dos plugins `withSceneLifecycle`/`withFirebaseCocoaPods` já existentes).
- `apps/mobile/src/app/(main)/_layout.tsx`: shell de navegação passa a decidir entre pilha e mestre-detalhe.
- `apps/mobile/src/core` (novo utilitário de classe de largura/breakpoint) e `apps/mobile/src/ui` (componentes de layout mestre-detalhe, hover).
- `apps/mobile/src/features/sessions` (lista com estado de seleção), `apps/mobile/src/features/conversation` (atalho de teclado, largura máxima), `apps/mobile/src/features/autocomplete` (ancoragem das sugestões).
- Sem novas dependências de runtime; eventuais capacidades de teclado externo usam APIs já disponíveis em `react-native` (`useWindowDimensions`, `Platform.isPad`) e `react-native-gesture-handler`/`react-native-reanimated` já presentes no projeto.
