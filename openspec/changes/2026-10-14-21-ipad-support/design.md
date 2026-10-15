## Context

Hoje `(main)/_layout.tsx` é um único `Stack` do Expo Router: toda navegação é tela-a-tela, em pilha, independente do tamanho da janela. `app.config.ts` tem `supportsTablet: false` e `orientation: 'portrait'` (ver proposal.md - Why). Não existe nenhuma infraestrutura de breakpoint/classe de tamanho no projeto; os tokens de tema (`src/core/theme/tokens.ts`) são fixos e pensados para a estética de terminal, não para escalar com o sistema. O app é hoje iOS-only (CLAUDE.md), então toda decisão aqui assume iPhone/iPad, não Android.

## Goals / Non-Goals

**Goals:**
- Um único mecanismo de classe de largura (compacta/regular) que outras features consultam, sem cada tela reinventar sua própria lógica de breakpoint.
- Layout mestre-detalhe que reaproveita as telas e rotas existentes (não duplica `session/[id]`, `new`, `settings` etc. para uma "versão iPad").
- Suporte a paisagem apenas no iPad, sem alterar o comportamento do iPhone.

**Non-Goals:**
- Android ou tema claro (fora do escopo do app como um todo, ver CLAUDE.md).
- Dynamic Type / escala de fonte do sistema: os tamanhos de `fontSize` continuam fixos. A estética de terminal depende de alinhamento previsível de colunas com JetBrains Mono; escalar isso pelo tamanho de texto do sistema é um projeto próprio, não parte desta compatibilidade de layout.
- Redimensionar o pane tmux (`cols`/`rows` de `pane.frame`, ver `openspec/specs/raw-terminal/spec.md`) conforme o tamanho da tela. O terminal bruto continua recebendo quadros do tamanho atual do pane; no iPad ele apenas ocupa melhor o painel de detalhe disponível (ajuste de escala/scroll), sem pedir ao daemon para redimensionar o pane real — isso mudaria a saída que outras ferramentas (tmux attach direto, outros clientes) veem do mesmo pane.
- Customização de atalhos de teclado pelo usuário: os atalhos são fixos (Cmd+N, Cmd+,, Esc, Cmd+Enter), sem tela de preferências.
- Apresentação de `new` (nova sessão) e dos alertas de permissão: `new` continua como modal (`presentation: 'modal'`) e os alertas de `app-permissions` continuam como estão — ambos já se comportam bem no iPad por serem nativamente dimensionados pelo sistema; só a navegação principal (lista ↔ conversa ↔ terminal ↔ subagente ↔ configurações) recebe o tratamento mestre-detalhe.

## Decisions

- **Classe de largura por breakpoint de ponto, não por `UITraitCollection`.** Um hook único (`useWidthClass()`, em `src/core/layout`) lê `useWindowDimensions()` e classifica `regular` quando a largura ≥ 680pt, senão `compact`. Alternativa descartada: expor `UITraitCollection.horizontalSizeClass` nativo (mais fiel ao HIG, mas exige módulo nativo novo só para isso). 680pt deixa iPad mini em retrato (744pt) e qualquer iPad em tela cheia como regular, iPhone (≤430pt) sempre compacto, e Split View estreito (~1/3 a 1/2 de telas menores) compacto — revisar o valor é um ajuste de constante, não de arquitetura.
- **Mestre-detalhe por composição, não por rota duplicada.** `(main)/_layout.tsx` passa a escolher, a cada render, entre o `Stack` atual (compacta) e um `MasterDetailLayout` (regular) que renderiza a lista de sessões como painel fixo e um `<Slot/>` do Expo Router para a rota filha ativa (`session/[id]`, `session/[id]/terminal`, `session/[id]/agent/[agentId]`, `settings`) como painel de detalhe. As rotas e seus params continuam os mesmos; só a casca em volta muda. Sem sessão ativa, o slot mostra o estado vazio (requirement "Navegação mestre-detalhe").
- **Seleção da lista vem do estado de navegação, não de um segundo store.** O item selecionado na lista (`app-session-list` - "Seleção no painel mestre") é derivado do segmento ativo da rota filha (`useSegments()`/`usePathname()` do Expo Router), evitando duas fontes de verdade para "qual sessão está aberta".
- **Orientação por idiom via `Info.plist`, não `expo-screen-orientation`.** Novo config plugin em `app.config.ts` (mesmo padrão de `withSceneLifecycle`/`withFirebaseCocoaPods`) grava `UISupportedInterfaceOrientations` (retrato only) e `UISupportedInterfaceOrientations~ipad` (retrato + paisagem) diretamente no `Info.plist`; o campo `orientation` do Expo é removido do config porque, se presente, o prebuild gera a chave sem o sufixo `~ipad` e sobrescreve o plugin. Alternativa descartada: `expo-screen-orientation` com lock condicional em runtime por `Platform.isPad` — funciona, mas adiciona uma dependência de runtime e um efeito a mais para algo que é puramente declarativo no iOS.
- **Ponteiro via `Pressable` (`onHoverIn`/`onHoverOut`), sem lib nova.** O React Native já expõe eventos de ponteiro no `Pressable`; sem trackpad/mouse conectado os callbacks simplesmente não disparam. Usado nos itens da lista e nos botões do shell.
- **Atalhos de teclado físico via `react-native-key-command`.** Biblioteca já usada em produção por apps RN para registrar `UIKeyCommand` no iOS/iPadOS sem exigir módulo nativo próprio do projeto. Cobre os atalhos do shell (Cmd+N, Cmd+,, Esc) e o Cmd+Enter do campo de prompt em `app-conversation`. Alternativa descartada: depender de `TextInput.onKeyPress`, que no iOS não expõe de forma confiável teclas modificadoras (Cmd) — serviria para capturar "Enter" isolado, mas não distinguir Cmd+Enter de Enter.
- **Largura de leitura fixa, não proporcional.** O limite de largura do conteúdo da conversa (`app-conversation` - "Largura de leitura em painéis largos") é uma constante de tema (`space`/novo token), não uma porcentagem do painel — evita diffs e blocos de código ficando absurdamente largos em iPads de 12.9" sem reintroduzir cálculo de breakpoint dentro da própria tela.

## Risks / Trade-offs

- [`react-native-key-command` incompatível com a versão atual do Expo/RN (57 / 0.86)] → spike rápido antes de iniciar `tasks.md`; se incompatível, os atalhos de teclado (não o mestre-detalhe, que não depende deles) ficam como *fast follow* — toda ação continua acessível por toque.
- [680pt como breakpoint único não cobrir bem algum tamanho real de Split View] → valor isolado em uma única função (`useWidthClass`), fácil de ajustar sem tocar nas telas que o consomem.
- [Remover o campo `orientation` do Expo e assumir o plist manualmente pode regredir se um futuro upgrade do Expo mudar como gera `UISupportedInterfaceOrientations`] → cobrir com `npx expo export --platform ios` no CI (já usado no projeto) mais uma checagem manual do `Info.plist` gerado como parte das tasks.

## Open Questions

- Confirmar, no spike de `react-native-key-command`, se o pacote precisa de passos extras de config plugin (além de `npx expo install`) para registrar o módulo nativo no prebuild atual do projeto.
