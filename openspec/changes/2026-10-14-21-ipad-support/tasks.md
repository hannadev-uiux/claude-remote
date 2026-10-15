## 1. Spike

- [ ] 1.1 Validar que `react-native-key-command` instala e registra um `UIKeyCommand` simples (ex.: Cmd+N) no development build atual (Expo SDK 57 / RN 0.86.3); verificar no simulador com "Hardware > Keyboard > Connect Hardware Keyboard" e observar o atalho disparar. Se incompatível, registrar a decisão no design.md e seguir sem os atalhos de teclado físico (tasks 5.2 e 7.1 ficam marcadas como não feitas, com nota do motivo)

## 2. Infraestrutura de layout

- [ ] 2.1 Criar `useWidthClass()` em `src/core/layout` (breakpoint 680pt sobre `useWindowDimensions`); verificar com testes Vitest simulando larguras diferentes (`pnpm --filter mobile test`)
- [ ] 2.2 Criar componente `MasterDetailLayout` em `src/ui` que recebe o painel mestre como children e renderiza `<Slot/>` do Expo Router como painel de detalhe; verificar com typecheck e `npx expo export --platform ios`

## 3. Orientação e supportsTablet

- [ ] 3.1 Em `apps/mobile/app.config.ts`: `supportsTablet: true`, remover o campo `orientation` do nível raiz e adicionar config plugin `withPerIdiomOrientation` gravando `UISupportedInterfaceOrientations` (retrato) e `UISupportedInterfaceOrientations~ipad` (retrato + paisagem) no `Info.plist`; verificar com `npx expo export --platform ios` e inspecionando o `Info.plist` gerado

## 4. Navegação mestre-detalhe no shell

- [ ] 4.1 `(main)/_layout.tsx` escolhe entre o `Stack` atual (classe compacta) e `MasterDetailLayout` com a lista de sessões como painel fixo (classe regular); verificar manualmente no simulador de iPad alternando Split View largo/estreito
- [ ] 4.2 Estado vazio no painel de detalhe quando nenhuma sessão está aberta em largura regular; verificar visualmente
- [ ] 4.3 Sessão/rota ativa no painel de detalhe derivada de `useSegments()`/`usePathname()`, sem store duplicado; verificar com teste do seletor
- [ ] 4.4 Reduzir a janela para largura compacta volta à navegação em pilha mostrando a última tela aberta em tela cheia, sem perder a sessão; verificar manualmente reduzindo o Split View

## 5. Ponteiro e teclado externo no shell

- [ ] 5.1 Hover (`onHoverIn`/`onHoverOut`) nos itens da lista de sessões e nos botões do shell; verificar manualmente no simulador com ponteiro de trackpad habilitado
- [ ] 5.2 Atalhos Cmd+N (nova sessão), Cmd+, (configurações) e Esc fora de campo de texto (fechar painel de detalhe) via `react-native-key-command`; verificar manualmente com teclado de hardware no simulador

## 6. Lista de sessões

- [ ] 6.1 Destaque visual da sessão selecionada quando a lista é exibida como painel mestre; verificar com teste de estado/seleção do componente
- [ ] 6.2 Navegação por setas e abertura com Enter na lista com foco; verificar manualmente com teclado externo

## 7. Conversa

- [ ] 7.1 Cmd+Enter envia o prompt e Enter isolado insere nova linha, com teclado físico conectado, sem alterar o botão de enviar; verificar com teste do handler de teclas e manualmente no simulador
- [ ] 7.2 Largura máxima de leitura do conteúdo da conversa (texto, diffs, tool calls) em painéis largos, via novo token em `src/core/theme`; verificar visualmente em iPad 12.9" paisagem e confirmar que painéis estreitos continuam ocupando toda a largura

## 8. Autocomplete

- [ ] 8.1 Ancorar as sugestões ao campo de prompt — acima do teclado virtual quando visível, imediatamente abaixo do campo quando não há teclado virtual na tela; verificar manualmente com e sem teclado de hardware conectado
- [ ] 8.2 Conter a lista de sugestões dentro da largura do painel de detalhe em layout mestre-detalhe, sem cobrir o painel mestre; verificar visualmente

## 9. Verificação final

- [ ] 9.1 `pnpm check` verde (typecheck + testes + Biome)
- [ ] 9.2 Checagem manual no simulador de iPad: rotação retrato/paisagem, Split View estreito↔largo, Slide Over; e no simulador de iPhone: confirmar que a navegação continua em pilha e em retrato, sem regressão
