## Purpose

Garante que apenas o aparelho pareado controle as sessões, já que o daemon equivale a um shell remoto.

## ADDED Requirements

### Requirement: Token obrigatório
Toda conexão WebSocket SHALL enviar `auth` com o token como primeira mensagem em até 5 segundos; caso contrário o daemon MUST fechar a conexão. Mensagens antes da autenticação MUST ser rejeitadas.

#### Scenario: Token correto
- **WHEN** o cliente envia `auth` com o token válido
- **THEN** o daemon responde `auth.ok` com a versão do protocolo e os perfis

#### Scenario: Token inválido
- **WHEN** o cliente envia `auth` com token errado
- **THEN** o daemon responde `error` `unauthorized` e fecha a conexão

#### Scenario: Sem autenticação
- **WHEN** o cliente não envia `auth` em 5 segundos
- **THEN** a conexão é fechada

### Requirement: Interface de rede restrita
O WebSocket SHALL escutar apenas no endereço Tailscale do Mac (faixa 100.64.0.0/10) ou, em modo de desenvolvimento explícito, em `127.0.0.1`. O endpoint de hooks MUST escutar apenas em `127.0.0.1` e exigir o segredo local.

#### Scenario: Tailscale ausente
- **WHEN** o daemon inicia sem interface Tailscale e sem modo dev
- **THEN** encerra com erro explicando que o Tailscale é necessário

#### Scenario: Hook sem segredo
- **WHEN** uma requisição chega ao endpoint de hooks sem o segredo
- **THEN** responde 401 e não processa o evento

### Requirement: Pareamento e rotação
O comando `pair` SHALL exibir um QR code com URL `claude-remote://pair?host=<ip>&port=<porta>&token=<token>`. O comando `rotate-token` MUST gerar novo token e derrubar conexões existentes.

#### Scenario: Rotação
- **WHEN** o usuário roda `rotate-token`
- **THEN** conexões abertas são fechadas e o token antigo deixa de ser aceito

### Requirement: Armazenamento do token
O token SHALL ser guardado no Keychain do macOS e nunca gravado em texto puro em disco.

#### Scenario: Token persistido
- **WHEN** o daemon reinicia
- **THEN** o mesmo token continua válido
