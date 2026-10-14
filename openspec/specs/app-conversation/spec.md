# app-conversation Specification

## Purpose
Exibe a conversa de uma sessão em tempo real e permite enviar prompts e teclas de controle.

## Requirements

### Requirement: Renderização das entradas
A tela SHALL exibir mensagens do usuário, texto do assistente em markdown, pensamento recolhido, tool calls recolhíveis com resumo de uma linha e resultados; erros de ferramenta MUST aparecer em vermelho.

#### Scenario: Tool call
- **WHEN** chega uma entrada `tool_use` de `Bash` com `command` "pnpm test"
- **THEN** aparece uma linha recolhida "Bash(pnpm test)" que expande para mostrar o resultado

#### Scenario: Entrada desconhecida
- **WHEN** chega uma entrada `unknown`
- **THEN** aparece um bloco discreto com o JSON bruto recolhido

### Requirement: Diffs
Tool calls `Edit`, `MultiEdit` e `Write` SHALL exibir diff com linhas removidas em vermelho e adicionadas em verde.

#### Scenario: Edição de arquivo
- **WHEN** o Claude edita um arquivo
- **THEN** a tool call mostra o caminho e o diff

### Requirement: Rolagem e histórico
A tela SHALL acompanhar o fim da conversa enquanto o usuário estiver no fim e carregar páginas anteriores ao rolar para o topo.

#### Scenario: Lendo histórico
- **WHEN** o usuário rolou para cima e chega nova entrada
- **THEN** a posição não muda e aparece o botão "novas mensagens"

### Requirement: Envio de prompt
O campo de prompt SHALL enviar `session.input` e limpar o campo após `ack`; em erro, MUST manter o texto e mostrar a mensagem. Em sessão somente leitura o campo MUST ficar desabilitado.

#### Scenario: Envio com sucesso
- **WHEN** o usuário envia "continue"
- **THEN** o campo é limpo e o prompt aparece na conversa quando gravado no transcript

### Requirement: Controles
A tela SHALL oferecer Esc (interromper) e Ctrl+C (com confirmação), além de uma barra de teclas (setas, Enter, Tab, 1-3).

#### Scenario: Interromper
- **WHEN** o usuário toca em Esc
- **THEN** o app envia `session.key` `Escape`
