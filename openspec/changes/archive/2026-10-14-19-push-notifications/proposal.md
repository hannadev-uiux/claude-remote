## Why

Sem push, o usuário só descobre que a sessão parou ou pediu permissão se estiver com o app aberto — e o `/rc` notifica todos os aparelhos da conta (D7, A7).

## What Changes

- App: registro do token FCM (`@react-native-firebase/messaging`) e envio por `device.register`.
- Daemon: envio de push via `firebase-admin` em `Stop`, `Notification` e pedido de permissão, só para tokens registrados.
- Payload mínimo: título genérico, perfil e id da sessão (sem conteúdo da sessão).
- Deep link para a sessão ao tocar; ações "Permitir" e "Negar" na notificação de permissão.
- Sem push quando o app está em primeiro plano conectado.

## Capabilities

### New Capabilities
- `push-notifications`: notificações push direcionadas ao aparelho pareado.

### Modified Capabilities

## Impact

`features/push` no daemon (dependência `firebase-admin`, service account local); app com `@react-native-firebase/app` e `messaging`, `expo-notifications` para categorias de ação. Requer conta Apple Developer paga e projeto Firebase.
