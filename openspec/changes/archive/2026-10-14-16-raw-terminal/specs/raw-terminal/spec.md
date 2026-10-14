## Purpose

Espelha no app o conteúdo bruto do painel tmux da sessão, como fallback para menus e diálogos da TUI.

## ADDED Requirements

### Requirement: Stream do painel
Após `pane.subscribe`, o daemon SHALL enviar `pane.frame { sessionId, text, cols, rows }` com o conteúdo visível do painel incluindo sequências de cor, apenas quando o conteúdo mudar, no máximo 4 vezes por segundo. `pane.unsubscribe` ou desconexão MUST encerrar a captura.

#### Scenario: Menu aberto
- **WHEN** a TUI abre o menu do `/model`
- **THEN** o app recebe um quadro com o menu

#### Scenario: Painel parado
- **WHEN** o conteúdo não muda
- **THEN** nenhum quadro novo é enviado

### Requirement: Terminal no app
A aba Terminal SHALL renderizar os quadros num emulador de terminal com o tema do app e uma barra de teclas (setas, Enter, Esc, Tab, Shift+Tab, Ctrl+C, 1-9).

#### Scenario: Navegar menu
- **WHEN** o usuário toca em seta para baixo e Enter
- **THEN** o app envia `session.key` `Down` e `Enter` e o quadro seguinte mostra a seleção
