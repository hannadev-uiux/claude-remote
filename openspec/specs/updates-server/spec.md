# updates-server Specification

## Purpose
TBD - created by archiving change 83-updates-server. Update Purpose after archive.

## Requirements

### Requirement: Update manifest
`GET /api/updates/manifest` SHALL answer with the latest manifest published for the request's channel (`expo-channel-name`, default `production`), `expo-platform` and `expo-runtime-version`, in Expo Updates protocol 1, with the signature stored at publish time, or `204` when nothing is published. Requests without a valid platform or runtime, or with an invalid channel, MUST get `400`; another protocol version MUST get `406`.

#### Scenario: Update available
- **WHEN** the iOS app with runtime `abc` asks for the manifest and two updates were published for `ios`/`abc` on `production`
- **THEN** it receives the newest as `multipart/mixed`, with `expo-signature` in the `manifest` part and `expo-protocol-version: 1`

#### Scenario: Nothing published
- **WHEN** there is no update for the requested channel, platform and runtime
- **THEN** the answer is `204`

#### Scenario: Separate channels
- **WHEN** an update exists only on `development` and the app asks without `expo-channel-name`
- **THEN** the answer is `204`; with `expo-channel-name: development` it receives the update

#### Scenario: JSON only
- **WHEN** the client accepts only `application/expo+json`
- **THEN** the manifest is the body and the signature is in the `expo-signature` header

### Requirement: Immutable assets
`GET /api/updates/assets/<hash>` SHALL serve the file whose SHA-256 (base64url) is `<hash>`, with the content type given at publish time and `cache-control: public, max-age=31536000, immutable`; `HEAD` SHALL say whether it is stored. Hashes outside the format MUST get `404`.

#### Scenario: Published asset
- **WHEN** the app downloads an asset listed in the manifest
- **THEN** it receives the content with the immutable cache header

### Requirement: Authenticated publishing
Publishing SHALL require `Authorization: Bearer` equal to the `UPDATES_TOKEN` secret (any channel) or the `UPDATES_DEV_TOKEN` secret (`development` and assets only), compared in constant time. The server MUST refuse an asset whose content does not hash to its URL or is larger than 50 MB, and a manifest without a signature, with a runtime version different from the body, with a missing asset, or with an asset URL that does not end in `/api/updates/assets/<its hash>`. The signing private key MUST NOT be needed by the server.

#### Scenario: Wrong token
- **WHEN** someone uploads an asset without a valid token
- **THEN** the answer is `401` and nothing is stored

#### Scenario: Development token on production
- **WHEN** CI publishes a manifest to `production` with the development token
- **THEN** the answer is `403` and nothing is stored

#### Scenario: Hash mismatch
- **WHEN** the body of a `PUT` does not have the SHA-256 of its URL
- **THEN** the answer is `400` and nothing is stored

#### Scenario: Missing asset
- **WHEN** a manifest lists an asset that was never uploaded
- **THEN** the answer is `409` with the missing hash and nothing is stored

#### Scenario: Publishing off
- **WHEN** no publish token is configured
- **THEN** the publish routes answer `404`

### Requirement: Channel filters
Every manifest answer (`200` or `204`) SHALL carry `expo-manifest-filters: channel="<channel>"`, so the app sets aside stored updates of another channel (by their signed `metadata.channel`).

#### Scenario: Back to production
- **WHEN** an app running a `development` update asks for the `production` manifest
- **THEN** the answer carries `expo-manifest-filters: channel="production"` and the app applies the production update even if it is older

### Requirement: Publisher and CI
`make publish-ota`, `make publish-ota-dry` and the `ota-development.yml` workflow SHALL publish to `https://remoteharness.app/api/updates/` with asset URLs under `https://remoteharness.app/api/updates/assets/`, and the repository MUST NOT contain a runtime link to `maarkn.dev`.

#### Scenario: Merge into development
- **WHEN** a commit lands on `development`
- **THEN** CI publishes the development update to the Worker with the development token and phones on that channel receive it
