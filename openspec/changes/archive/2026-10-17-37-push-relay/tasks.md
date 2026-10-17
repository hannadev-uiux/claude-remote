## 1. Relay

- [x] 1.1 `apps/push-relay` package: pure `sealGrant`/`openGrant`, `targetMessage`, rate limiter, with Vitest tests
- [x] 1.2 `createRelayHandler` (routes, App Check, FCM errors) with tests on fakes; `index.ts` with `onRequest`, `GRANT_KEY` secret, `APP_CHECK` parameter, `maxInstances`
- [x] 1.3 esbuild bundle into `deploy/`, `firebase.json`, `make deploy-push-relay`

## 2. Protocol and daemon

- [x] 2.1 `relay` on `device.register` / `live.register` with tests
- [x] 2.2 Device registry keeps `relay`; senders take devices; relay sender (`fetch`) with tests; sender selection
- [x] 2.3 Live status registrations keep `relay`

## 3. App

- [x] 3.1 `@react-native-firebase/app-check`, relay URL in `extra`, `requestGrant` with tests for the pure parts
- [x] 3.2 `usePush` and `useLiveStatus` send `relay` with their registrations

## 4. Docs and verification

- [x] 4.1 README (en, pt-BR): relay and self-hosted modes, deploy steps
- [x] 4.2 `pnpm check` green (protocol 71, daemon 272, mobile 196, relay 10 tests), functions emulator run of `/grant` and `/send`, bundle builds, iOS export bundles
