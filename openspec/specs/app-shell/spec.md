# app-shell Specification

## Purpose
Fornece a base do app móvel: identidade visual de terminal, navegação e conexão resiliente com o daemon.

## Requirements

### Requirement: Tema terminal escuro
O app SHALL usar exclusivamente um tema escuro com fonte monoespaçada e o laranja do Claude como destaque, independentemente do tema do sistema.

#### Scenario: iPhone em modo claro
- **WHEN** o sistema está em modo claro
- **THEN** o app continua com o tema escuro

### Requirement: Ícone do app
O app SHALL ter ícone com o símbolo do Claude Code em primeiro plano sobre um terminal com `>_` ao fundo.

#### Scenario: Tela inicial do iPhone
- **WHEN** o app é instalado
- **THEN** o ícone exibido é o do Claude Remote

### Requirement: Conexão autenticada
Ao iniciar com credenciais pareadas, o app SHALL conectar ao daemon e enviar `auth` como primeira mensagem; sem credenciais, MUST abrir a tela de pareamento.

#### Scenario: Sem pareamento
- **WHEN** o app abre pela primeira vez
- **THEN** a tela de pareamento é exibida

### Requirement: Reconexão automática
Ao perder a conexão, o app SHALL tentar reconectar com backoff exponencial (1 s até 30 s), reconectar imediatamente ao voltar ao primeiro plano, e reassinar as sessões abertas com o último cursor recebido.

#### Scenario: Troca de rede
- **WHEN** o celular troca de Wi-Fi para 4G
- **THEN** o app reconecta e a conversa continua do ponto em que parou, sem mensagens duplicadas

#### Scenario: Indicador de conexão
- **WHEN** a conexão cai
- **THEN** o app mostra o estado "reconectando" no topo

### Requirement: Requisições com tempo limite
Requisições SHALL ser correlacionadas por `id` e falhar com erro após 15 s sem resposta.

#### Scenario: Daemon não responde
- **WHEN** uma requisição fica 15 s sem resposta
- **THEN** a promessa é rejeitada com erro de tempo limite
