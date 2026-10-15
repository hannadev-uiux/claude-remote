## Context

Depends on `DaemonClient` (change 10) and on the `pair` URL format (change 03).

## Goals / Non-Goals

**Goals:** pair in under 10 seconds.

**Non-Goals:** multiple daemons.

## Decisions

- **`parsePairingUrl`**, pure (tested), using `URL` and Zod validation.
- **`CameraView`** from `expo-camera` with `barcodeScannerSettings: { barcodeTypes: ["qr"] }`; locks after the first valid scan so it doesn't trigger several connections.
- **Connection test** with a temporary `DaemonClient` instance without reconnection.
- **Credentials store** in `src/core/storage/credentials.ts` (SecureStore, a single key holding JSON).
- `ws://` (not TLS): traffic is encrypted by Tailscale's WireGuard; `NSAppTransportSecurity` relaxed for `NSAllowsLocalNetworking` and IP exceptions.

## Risks / Trade-offs

- [ATS blocks ws:// on a 100.x IP] → `NSAllowsArbitraryLoads` restricted to the personal dev build (the app is not going to the store).
