## MODIFIED Requirements

### Requirement: Sugestões no app
Ao digitar `@` ou `/` (no início do prompt para `/`), o app SHALL mostrar sugestões ancoradas ao campo de prompt — acima do teclado virtual quando ele estiver visível, ou imediatamente abaixo do campo quando não houver teclado virtual na tela (teclado físico externo conectado) —, atualizando com debounce de 150 ms, e inserir `@caminho` ou `/nome ` ao tocar ou ao confirmar pelo teclado.

#### Scenario: Escolher arquivo
- **WHEN** o usuário digita "@app" e toca em `src/app.ts`
- **THEN** o texto vira "@src/app.ts "

#### Scenario: Teclado externo conectado
- **WHEN** o usuário digita "@app" com um teclado físico conectado e nenhum teclado virtual na tela
- **THEN** as sugestões aparecem ancoradas abaixo do campo de prompt, não no lugar onde o teclado virtual ficaria

#### Scenario: Layout mestre-detalhe
- **WHEN** o usuário digita "/" no painel de detalhe em largura regular
- **THEN** as sugestões ficam contidas na largura do painel de detalhe, sem cobrir o painel mestre
