## Purpose

Avisa o aparelho pareado quando uma sessão precisa de atenção, sem expor o conteúdo da sessão a serviços externos.

## ADDED Requirements

### Requirement: Registro do aparelho
O app SHALL pedir permissão de notificação, obter o token FCM e enviar `device.register`; o daemon MUST guardar apenas tokens recebidos por conexões autenticadas.

#### Scenario: Token renovado
- **WHEN** o FCM renova o token
- **THEN** o app envia o novo token e o daemon substitui o antigo

### Requirement: Disparo de push
O daemon SHALL enviar push para os tokens registrados quando uma sessão termina um turno (`Stop`), recebe `Notification` ou gera pedido de permissão, exceto se houver cliente conectado com o app em primeiro plano. Sem configuração do Firebase, o daemon MUST seguir funcionando sem push.

#### Scenario: Sessão termina
- **WHEN** chega `Stop` e o app está em segundo plano
- **THEN** o aparelho recebe "Sessão concluída" com o perfil

#### Scenario: Firebase não configurado
- **WHEN** não há service account
- **THEN** o daemon registra um aviso e não envia push

### Requirement: Payload sem conteúdo
O payload MUST conter apenas título genérico, nome do perfil, `sessionId`, tipo do evento e `requestId` quando houver; nunca prompts, comandos ou caminhos.

#### Scenario: Pedido de permissão
- **WHEN** um `Bash` pede permissão
- **THEN** o push diz "Permissão pendente" e o perfil, sem o comando

### Requirement: Deep link e ações
Tocar na notificação SHALL abrir a sessão; as ações "Permitir"/"Negar" MUST responder o pedido conectando ao daemon em segundo plano.

#### Scenario: Negar pela notificação
- **WHEN** o usuário toca "Negar" na notificação
- **THEN** o app envia `permission.respond` com `deny`
