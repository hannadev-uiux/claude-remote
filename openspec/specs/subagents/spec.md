# subagents Specification

## Purpose
Mostra os subagentes e as tarefas em background de cada sessão, aninhados sob a sessão pai.

## Requirements

### Requirement: Descoberta de subagentes
O daemon SHALL listar os subagentes de cada sessão com `agentId`, `agentType`, `state` (`running` ou `done`) e `updatedAt`, a partir dos arquivos de transcript de subagentes e do hook `SubagentStop`, enviando `subagent.updated` a cada mudança.

#### Scenario: Subagente iniciado
- **WHEN** surge um novo `agent-<id>.jsonl` na pasta da sessão
- **THEN** os clientes recebem `subagent.updated` com `state: "running"`

#### Scenario: Subagente concluído
- **WHEN** chega `SubagentStop` para o agente
- **THEN** o estado passa a `done`

### Requirement: Transcript de subagente
`session.subscribe` com `agentId` SHALL transmitir o transcript do subagente com as mesmas regras do transcript principal.

#### Scenario: Abrir subagente
- **WHEN** o usuário toca num subagente
- **THEN** vê a conversa do subagente em somente leitura

### Requirement: Tarefas em background
A sessão SHALL expor `backgroundTasks` com as tarefas em background informadas no último `Stop`.

#### Scenario: Comando em background
- **WHEN** o `Stop` informa uma tarefa em background
- **THEN** a sessão aparece na lista com selo "background" e a contagem de tarefas

### Requirement: Aninhamento no app
O app SHALL mostrar os subagentes aninhados sob a sessão pai, com estado, e uma seção de subagentes na tela da sessão.

#### Scenario: Lista
- **WHEN** a sessão tem dois subagentes rodando
- **THEN** a linha da sessão mostra "2 subagentes" e expande para listá-los
