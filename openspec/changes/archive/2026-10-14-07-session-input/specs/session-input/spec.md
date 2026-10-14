## Purpose

Permite enviar prompts e teclas especiais para uma sessão do Claude Code em execução no tmux, como se tivessem sido digitados no Mac.

## ADDED Requirements

### Requirement: Envio de prompt por colagem
O daemon SHALL colar o texto completo no painel da sessão usando bracketed paste e, em seguida, enviar Enter. Texto com várias linhas, `@` e `/` MUST chegar inalterado.

#### Scenario: Prompt com várias linhas
- **WHEN** o app envia "linha 1\nlinha 2"
- **THEN** a TUI recebe as duas linhas num único prompt e o envia

#### Scenario: Prompt com menção
- **WHEN** o app envia "revise @src/main.ts"
- **THEN** o texto é colado sem abrir o menu de autocomplete antes do Enter

### Requirement: Teclas especiais
O daemon SHALL aceitar apenas teclas de uma lista permitida e enviá-las com `send-keys`. Teclas fora da lista MUST ser recusadas com `invalid_key`.

#### Scenario: Interromper
- **WHEN** o app envia `session.key` com `Escape`
- **THEN** o painel recebe Esc

#### Scenario: Tecla não permitida
- **WHEN** o app envia a tecla `C-z`
- **THEN** o daemon responde `error` `invalid_key`

### Requirement: Sessão não controlável
Entrada para sessão sem painel vivo MUST ser recusada com `not_controllable`.

#### Scenario: Sessão encerrada
- **WHEN** o app envia texto para uma sessão `ended`
- **THEN** recebe `error` `not_controllable`

### Requirement: Limite de tamanho
Prompts acima de 100 KB MUST ser recusados com `too_large`.

#### Scenario: Texto enorme
- **WHEN** o app envia 200 KB de texto
- **THEN** recebe `error` `too_large`
