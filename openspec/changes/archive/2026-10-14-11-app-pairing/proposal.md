## Why

The app needs to know where the daemon is and which token to use without manually typing a long token (A1).

## What Changes

- Pairing screen with a QR reader (`expo-camera`) for the `claude-remote://pair?...` URL.
- Manual entry of host, port and token as an alternative.
- Connection test before saving; credentials in `expo-secure-store`.
- Settings screen with the pairing details, "forget daemon" and version.

## Capabilities

### New Capabilities
- `app-pairing`: pairing the app with the daemon and storing the credentials securely.

### Modified Capabilities

## Impact

`src/features/pairing`, `src/features/settings`; dependencies `expo-camera`, `expo-secure-store`.
