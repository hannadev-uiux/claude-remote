## Purpose

Mostra no app todas as sessões dos perfis configurados, com estado em tempo real, e leva à tela da sessão.

## ADDED Requirements

### Requirement: Agrupamento por perfil
A lista SHALL agrupar sessões por perfil, cada grupo com nome e cor do perfil, ordenadas por: aguardando primeiro, depois rodando, ociosa e encerrada, e por `updatedAt` decrescente dentro de cada estado.

#### Scenario: Sessão aguardando
- **WHEN** uma sessão do perfil `drclaude` está aguardando permissão
- **THEN** ela aparece no topo do grupo `drclaude` com selo "aguardando"

### Requirement: Atualização em tempo real
A lista SHALL refletir `session.updated` e `session.removed` sem recarregar a tela.

#### Scenario: Sessão termina
- **WHEN** uma sessão passa de `running` para `idle`
- **THEN** o selo muda na lista sem ação do usuário

### Requirement: Somente leitura
Sessões com `controllable: false` SHALL exibir selo "somente leitura".

#### Scenario: Sessão fora do tmux
- **WHEN** a sessão não tem painel
- **THEN** aparece com selo "somente leitura"

### Requirement: Estado vazio
Sem sessões, a tela SHALL mostrar instrução para iniciar com `claudin` ou `drclaude`.

#### Scenario: Nenhuma sessão
- **WHEN** o snapshot vem vazio
- **THEN** a tela mostra a instrução de uso dos launchers
