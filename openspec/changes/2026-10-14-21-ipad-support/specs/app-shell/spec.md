## ADDED Requirements

### Requirement: Classes de largura e orientação
O app SHALL calcular a classe de largura da janela a partir das dimensões disponíveis: regular quando a largura for de pelo menos 680pt, compacta abaixo disso. No iPad, o app SHALL permitir orientação retrato e paisagem; no iPhone, a orientação MUST permanecer travada em retrato.

#### Scenario: iPad em tela cheia, paisagem
- **WHEN** o usuário gira um iPad em tela cheia para paisagem
- **THEN** o app permanece utilizável e recalcula a classe de largura para regular

#### Scenario: iPhone girado
- **WHEN** o usuário gira um iPhone para o lado
- **THEN** a tela permanece em retrato

#### Scenario: iPad em Split View estreito
- **WHEN** o iPad está em Split View com menos de 680pt de largura disponível
- **THEN** a classe de largura calculada é compacta

### Requirement: Navegação mestre-detalhe
Em classe de largura regular, o app SHALL exibir a lista de sessões como painel fixo e a tela ativa (conversa, nova sessão, configurações, terminal, subagente) como painel de detalhe, os dois visíveis simultaneamente. Em classe compacta, o app SHALL manter a navegação em pilha atual, uma tela por vez.

#### Scenario: Abrir sessão em largura regular
- **WHEN** o usuário toca numa sessão da lista com o app em largura regular
- **THEN** a conversa abre no painel de detalhe e a lista continua visível

#### Scenario: Reduzir para largura compacta
- **WHEN** o usuário reduz a janela do app para menos que o limiar de largura regular
- **THEN** o app volta à navegação em pilha, mostrando a última tela aberta em tela cheia

#### Scenario: Sem sessão aberta
- **WHEN** o app abre em largura regular sem nenhuma sessão aberta anteriormente
- **THEN** o painel de detalhe mostra um estado vazio convidando a escolher ou iniciar uma sessão

### Requirement: Ponteiro e teclado externo no shell
Com ponteiro (trackpad ou mouse) conectado, itens de lista e botões do shell SHALL mostrar um estado de hover. Com teclado físico conectado, o shell SHALL oferecer atalhos para nova sessão (Cmd+N), configurações (Cmd+,) e fechar o painel de detalhe (Esc, fora de um campo de texto).

#### Scenario: Hover em item de sessão
- **WHEN** o ponteiro passa sobre um item da lista de sessões
- **THEN** o item recebe destaque visual de hover

#### Scenario: Atalho de nova sessão
- **WHEN** o usuário pressiona Cmd+N com teclado externo conectado
- **THEN** a tela de nova sessão abre

#### Scenario: Atalho de configurações
- **WHEN** o usuário pressiona Cmd+, com teclado externo conectado
- **THEN** a tela de configurações abre

#### Scenario: Fechar painel de detalhe
- **WHEN** o usuário pressiona Esc com o painel de detalhe aberto em largura regular e o foco fora de um campo de texto
- **THEN** o painel de detalhe volta ao estado vazio

### Requirement: Multitarefa no iPad
O app SHALL permanecer funcional em qualquer largura de Split View ou Slide Over no iPad, recalculando a classe de largura e a navegação sempre que o sistema redimensionar a janela do app.

#### Scenario: Redimensionar Split View
- **WHEN** o usuário arrasta o divisor do Split View e a largura cruza o limiar entre compacta e regular
- **THEN** o app alterna entre pilha e mestre-detalhe sem perder a sessão aberta
