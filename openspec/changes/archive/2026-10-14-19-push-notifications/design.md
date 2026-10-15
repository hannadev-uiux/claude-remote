## Context

Prerequisites (PRD 9.1): paid Apple Developer account, APNs key in Firebase, `GoogleService-Info.plist`, development build.

## Decisions

- **Daemon**: `firebase-admin` loaded lazily, only if `~/.claude-remote/firebase-service-account.json` exists. Tokens in `~/.claude-remote/devices.json`. Messages with `apns.payload.aps.category = "PERMISSION"` for requests.
- **Foreground**: the app sends `app.visibility { foreground }` (defined in the protocol) when `AppState` changes; the daemon suppresses push if any client is in the foreground.
- **App**: `@react-native-firebase/messaging` for token/receiving; `expo-notifications` to register the category with actions and handle the action response (opens a short-lived connection, sends `permission.respond`, closes).
- **Deep link**: `claude-remote://session/<id>` via Expo Router.
- Config plugins `@react-native-firebase/app` and `expo-build-properties` (`useFrameworks: "static"`).

## Risks / Trade-offs

- [Background action without time to connect] → action marked `opensAppToForeground: false`, falling back to opening the app if it fails.
