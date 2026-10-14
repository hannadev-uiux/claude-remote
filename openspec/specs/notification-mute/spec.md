# notification-mute Specification

## Purpose
Permite silenciar notificações push de perfis ou sessões específicas.

## Requirements

### Requirement: Silenciar
`settings.mute` SHALL adicionar ou remover um perfil ou sessão da lista de silenciados, persistida no daemon; eventos de alvos silenciados MUST NOT gerar push. Pedidos de permissão de alvos silenciados continuam aparecendo no app.

#### Scenario: Perfil silenciado
- **WHEN** o perfil `claudin` está silenciado e uma sessão dele termina
- **THEN** nenhum push é enviado

#### Scenario: Reativar
- **WHEN** o usuário reativa o perfil
- **THEN** os próximos eventos voltam a gerar push

### Requirement: Controles no app
O app SHALL mostrar interruptores por perfil nas configurações e um botão de silenciar no cabeçalho da sessão, refletindo o estado vindo do daemon em `auth.ok`.

#### Scenario: Silenciar sessão
- **WHEN** o usuário toca no sino da sessão
- **THEN** o app envia `settings.mute` e o ícone muda para silenciado
