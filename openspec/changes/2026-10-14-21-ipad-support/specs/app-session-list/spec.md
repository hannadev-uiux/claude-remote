## ADDED Requirements

### Requirement: Seleção no painel mestre
Quando exibida como painel mestre ao lado do painel de detalhe (largura regular), a lista SHALL destacar visualmente a sessão atualmente aberta no detalhe e SHALL aceitar navegação pelas setas do teclado e abertura com Enter.

#### Scenario: Sessão aberta destacada
- **WHEN** a conversa de uma sessão está aberta no painel de detalhe
- **THEN** o item correspondente na lista aparece com destaque de seleção

#### Scenario: Navegação por teclado
- **WHEN** o usuário pressiona a seta para baixo com o foco na lista
- **THEN** a seleção move para a próxima sessão do agrupamento, respeitando a ordem atual

#### Scenario: Abrir com Enter
- **WHEN** o usuário pressiona Enter com uma sessão selecionada pelo teclado
- **THEN** essa sessão abre no painel de detalhe
