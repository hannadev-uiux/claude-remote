## Purpose

Liga o app a um daemon específico de forma segura, lendo endereço e token por QR code ou entrada manual.

## ADDED Requirements

### Requirement: Pareamento por QR
O app SHALL ler o QR exibido por `claude-remote pair`, extrair host, porta e token, testar a conexão e, se `auth.ok`, salvar as credenciais e abrir a lista de sessões.

#### Scenario: QR válido
- **WHEN** o usuário aponta a câmera para o QR do daemon
- **THEN** o app conecta, salva as credenciais e mostra a lista de sessões

#### Scenario: QR de outro formato
- **WHEN** o QR não é uma URL `claude-remote://pair`
- **THEN** o app mostra "QR inválido" e continua lendo

#### Scenario: Token rejeitado
- **WHEN** o daemon responde `unauthorized`
- **THEN** nada é salvo e o app mostra o erro

### Requirement: Entrada manual
O app SHALL permitir informar host, porta e token manualmente com o mesmo teste de conexão.

#### Scenario: Sem câmera
- **WHEN** o usuário nega a permissão de câmera
- **THEN** o formulário manual é oferecido

### Requirement: Armazenamento seguro
O token MUST ser guardado apenas no SecureStore (Keychain do iOS).

#### Scenario: Reabrir o app
- **WHEN** o app é fechado e aberto
- **THEN** conecta automaticamente com as credenciais salvas

### Requirement: Esquecer daemon
A tela de configurações SHALL permitir apagar as credenciais e voltar ao pareamento.

#### Scenario: Esquecer
- **WHEN** o usuário confirma "Esquecer daemon"
- **THEN** as credenciais são apagadas, a conexão fecha e a tela de pareamento aparece
