## MODIFIED Requirements

### Requirement: Envio de prompt
O campo de prompt SHALL enviar `session.input` e limpar o campo após `ack`; em erro, MUST manter o texto e mostrar a mensagem. Em sessão somente leitura o campo MUST ficar desabilitado. Com teclado físico externo conectado, Enter SHALL inserir uma nova linha e Cmd+Enter SHALL disparar o envio, sem alterar o comportamento do botão de enviar na tela.

#### Scenario: Envio com sucesso
- **WHEN** o usuário envia "continue"
- **THEN** o campo é limpo e o prompt aparece na conversa quando gravado no transcript

#### Scenario: Envio por teclado externo
- **WHEN** o usuário pressiona Cmd+Enter com um teclado físico conectado
- **THEN** o app envia o prompt como se tivesse tocado o botão de enviar

#### Scenario: Nova linha com teclado externo
- **WHEN** o usuário pressiona apenas Enter com um teclado físico conectado
- **THEN** o app insere uma nova linha no campo sem enviar

## ADDED Requirements

### Requirement: Largura de leitura em painéis largos
Quando o painel de detalhe for mais largo que a largura de leitura confortável, o conteúdo da conversa (texto, pensamento, tool calls e diffs) SHALL ficar centralizado numa coluna de largura máxima, em vez de esticar borda a borda.

#### Scenario: iPad em tela cheia, paisagem
- **WHEN** a sessão abre no painel de detalhe de um iPad em paisagem com tela cheia
- **THEN** o conteúdo da conversa é centralizado numa coluna de largura máxima, com espaço livre nas laterais

#### Scenario: Painel de detalhe estreito
- **WHEN** o painel de detalhe é mais estreito que a largura máxima de leitura (iPhone, ou iPad em Split View estreito)
- **THEN** o conteúdo ocupa toda a largura disponível, como hoje
