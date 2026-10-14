# daemon-service Specification

## Purpose
Mantém o daemon rodando como serviço do usuário no macOS, iniciando com o login e se recuperando de falhas.

## Requirements

### Requirement: LaunchAgent
`service install` SHALL gravar e carregar um LaunchAgent com `RunAtLoad` e `KeepAlive`, usando o caminho absoluto do Node atual; `service uninstall` MUST descarregar e remover o arquivo.

#### Scenario: Login
- **WHEN** o usuário faz login no Mac
- **THEN** o daemon inicia automaticamente

#### Scenario: Queda do processo
- **WHEN** o processo do daemon termina com erro
- **THEN** o launchd o reinicia

### Requirement: Identidade do item de login
O LaunchAgent SHALL executar o daemon por meio de um bundle `~/.claude-remote/Claude Remote.app` (assinado ad-hoc, com o ícone do app), para que o macOS mostre "Claude Remote" — e não o assinante do Node — em Itens de Início e no aviso de atividade em segundo plano. `service uninstall` MUST remover o bundle.

#### Scenario: Aviso de atividade em segundo plano
- **WHEN** o serviço é instalado
- **THEN** o macOS identifica o item como "Claude Remote"

### Requirement: Espera pelo Tailscale
Rodando como serviço, o daemon SHALL aguardar a interface Tailscale aparecer (consultando periodicamente e registrando um aviso único) em vez de encerrar, evitando um ciclo de reinícios do launchd. O endpoint de hooks MUST ficar disponível durante a espera, para que as sessões do Claude Code nunca encontrem a porta fechada.

#### Scenario: Login antes do Tailscale conectar
- **WHEN** o serviço inicia e ainda não há interface 100.x
- **THEN** o daemon aguarda e passa a escutar assim que o Tailscale conecta

### Requirement: Reinício do tmux
Quando o servidor tmux reinicia, o daemon SHALL marcar como encerradas as sessões cujos painéis sumiram e continuar aceitando novas sessões sem reinício.

#### Scenario: tmux kill-server
- **WHEN** o usuário roda `tmux kill-server`
- **THEN** as sessões aparecem como encerradas e uma nova sessão via launcher é registrada normalmente
