## Purpose

Mantém o daemon rodando como serviço do usuário no macOS, iniciando com o login e se recuperando de falhas.

## ADDED Requirements

### Requirement: LaunchAgent
`service install` SHALL gravar e carregar um LaunchAgent com `RunAtLoad` e `KeepAlive`, usando o caminho absoluto do Node atual; `service uninstall` MUST descarregar e remover o arquivo.

#### Scenario: Login
- **WHEN** o usuário faz login no Mac
- **THEN** o daemon inicia automaticamente

#### Scenario: Queda do processo
- **WHEN** o processo do daemon termina com erro
- **THEN** o launchd o reinicia

### Requirement: Reinício do tmux
Quando o servidor tmux reinicia, o daemon SHALL marcar como encerradas as sessões cujos painéis sumiram e continuar aceitando novas sessões sem reinício.

#### Scenario: tmux kill-server
- **WHEN** o usuário roda `tmux kill-server`
- **THEN** as sessões aparecem como encerradas e uma nova sessão via launcher é registrada normalmente
