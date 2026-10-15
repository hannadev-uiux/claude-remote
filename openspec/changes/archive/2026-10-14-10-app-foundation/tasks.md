## 1. Project

- [x] 1.1 Create the Expo app with Expo Router, strict TypeScript, `expo-dev-client` and the monorepo config in Metro; verify with `pnpm --filter mobile typecheck` and `npx expo export --platform ios`
- [x] 1.2 Create theme tokens, JetBrains Mono fonts and base UI components (`Screen`, `Text`, `Button`, `Badge`, `Card`, `IconButton`); verify with typecheck

## 2. Icon

- [x] 2.1 Draw `icon.svg` and a `pnpm icons` script that generates `icon.png`, `splash.png` and `adaptive-icon.png`; verify the generated PNG visually

## 3. Connection

- [x] 3.1 Implement `DaemonClient` with handshake, requests with timeout, backoff and events; verify with Vitest tests using a fake WebSocket
- [x] 3.2 Implement the connection store (Zustand), React provider and status banner; verify with typecheck and a store test
- [x] 3.3 Set up the root layout with a redirect to pairing when there are no credentials; verify with `expo export`
