## Why

After the rename to Remote Harness, the over-the-air updates still depend on an unrelated personal site (issue #133): the `apps/web` Worker forwards `remoteharness.app/api/updates/*` to `https://maarkn.dev/api/claude-remote/updates/`, and the CI workflow and README sign asset URLs on `maarkn.dev`. The landing's link preview image comes from `raw.githubusercontent.com`, and the app only answers the `claude-remote://` deep-link scheme.

## What Changes

- **Audit** of every URL and legacy name, with what changes, what stays and why (design).
- **Own updates server in the `apps/web` Worker, backed by R2** (bucket `remote-harness-updates`): the Expo Updates protocol 1 endpoints the publisher and the app already use, at the same URLs.
  - `GET /api/updates/manifest`: latest signed manifest per channel, platform and runtime.
  - `GET|HEAD|PUT /api/updates/assets/<hash>`: content-addressed assets.
  - `POST /api/updates/manifests`: authenticated publish, production or development token.
  - Behavior ported from the current server: multipart response with the stored signature, `expo-manifest-filters`, channels, a development-only token, hash and manifest checks. The server never holds the signing key.
- **Same URL for installed builds**: `https://remoteharness.app/api/updates/manifest` is part of the runtime version and does not change, so builds made with it keep receiving updates once updates are published to the new server. The certificate (`certs/certificate.pem`) is unchanged.
- `make publish-ota`, `make publish-ota-dry` and `.github/workflows/ota-development.yml` publish there; the `maarkn.dev` assets URL is dropped (assets default to `<updates base>/assets/`).
- **Link preview image** served by the Worker at `/og.png` instead of `raw.githubusercontent.com`.
- **Deep links**: the app also registers `remoteharness://` and accepts `remoteharness://pair?…` as well as `claude-remote://pair?…` (QR codes already printed keep working). The daemon keeps printing `claude-remote://` until no app build without the new scheme is left.
- The Android notification channel keeps its id (`claude-remote`): Android ties the user's sound and importance settings to the id and offers no migration, so renaming it would reset them. Its visible name is already translated ("Sessions").

## Capabilities

### New Capabilities
- `updates-server`: the Expo Updates server on remoteharness.app.

### Modified Capabilities
- `project-domain`: the updates proxy becomes the updates server.
- `web-landing`: the preview image and the Worker's other paths.
- `app-pairing`: pairing links with either scheme.

## Impact

`apps/web` (updates handler, R2 store, protocol and validation with Zod, routes, `/og.png`, config: R2 bucket and two secrets), `.github/workflows/ota-development.yml`, README, `apps/mobile` (scheme, pairing parser, publisher docs), `openspec/changes/27-app-updates` (design note). Deploy: create the bucket, set `UPDATES_TOKEN` and `UPDATES_DEV_TOKEN` on the Worker (and `OTA_DEV_TOKEN` in GitHub to the same development token), deploy, then publish the current updates once to the new server.
