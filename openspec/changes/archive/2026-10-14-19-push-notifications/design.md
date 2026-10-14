## Context

Pré-requisitos (PRD 9.1): conta Apple Developer paga, chave APNs no Firebase, `GoogleService-Info.plist`, development build.

## Decisions

- **Daemon**: `firebase-admin` carregado de forma preguiçosa só se `~/.claude-remote/firebase-service-account.json` existir. Tokens em `~/.claude-remote/devices.json`. Mensagens com `apns.payload.aps.category = "PERMISSION"` para pedidos.
- **Primeiro plano**: o app envia `app.visibility { foreground }` (definida no protocolo) ao mudar `AppState`; o daemon suprime push se algum cliente estiver em primeiro plano.
- **App**: `@react-native-firebase/messaging` para token/recebimento; `expo-notifications` para registrar a categoria com ações e tratar a resposta da ação (abre conexão curta, envia `permission.respond`, fecha).
- **Deep link**: `claude-remote://session/<id>` via Expo Router.
- Config plugin `@react-native-firebase/app` e `expo-build-properties` (`useFrameworks: "static"`).

## Risks / Trade-offs

- [Ação em segundo plano sem tempo de conectar] → ação marcada `opensAppToForeground: false` com fallback para abrir o app se falhar.
