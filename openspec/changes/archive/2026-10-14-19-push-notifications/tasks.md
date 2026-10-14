## 1. Protocolo e daemon

- [x] 1.1 Implementar `DeviceRegistry` e `PushService` (firebase-admin preguiçoso, supressão em primeiro plano, payload mínimo); verificar com testes usando enviador falso
- [x] 1.2 Ligar `Stop`, `Notification` e `permission.request` ao `PushService`; verificar com teste de integração

## 2. App

- [x] 2.1 Configurar `@react-native-firebase` e `expo-notifications` no `app.config.ts`; verificar com `npx expo config --type introspect`
- [x] 2.2 Implementar registro do token, `app.visibility`, deep link e ações Permitir/Negar; verificar com typecheck
