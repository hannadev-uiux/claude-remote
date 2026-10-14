## Purpose

Permite configurar os perfis do Claude Code (diretórios de configuração) e os parâmetros do daemon em um arquivo local.

## ADDED Requirements

### Requirement: Perfis configuráveis
O daemon SHALL carregar perfis com `id`, `name`, `configDir` e `color` de `~/.claude-remote/config.json`. Na ausência do arquivo, MUST criar um com os perfis padrão `claudin` (`~/.claude`) e `drclaude` (`~/.claude-doctorx`).

#### Scenario: Primeira execução
- **WHEN** o daemon inicia sem arquivo de configuração
- **THEN** cria o arquivo com os dois perfis padrão e segue executando

#### Scenario: Configuração inválida
- **WHEN** o arquivo existe mas tem JSON inválido ou campo obrigatório ausente
- **THEN** o daemon encerra com mensagem indicando o campo inválido

### Requirement: Diretório de perfil inexistente
O daemon SHALL ignorar perfis cujo `configDir` não exista, registrando um aviso.

#### Scenario: Perfil sem diretório
- **WHEN** um perfil aponta para um diretório que não existe
- **THEN** o perfil não aparece na lista e um aviso é registrado no log
