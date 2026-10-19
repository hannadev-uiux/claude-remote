## Context

`scripts/publish-update.mts` exports the app, signs one manifest per platform locally (RSA-SHA256, `keyid: main`), uploads missing assets with `PUT <base>/assets/<hash>` and the manifest with `POST <base>/manifests`, using a bearer token. The app checks `GET <base>/manifest` with `expo-platform`, `expo-runtime-version`, `expo-channel-name` and verifies the signature against `certs/certificate.pem` embedded in the build. The server lives on `maarkn.dev` (Next.js on a droplet, files on a volume) and requires asset URLs to point at its own path. `remoteharness.app/api/updates/*` is a Worker proxy to it.

## Audit

| Reference | Where | Decision |
| --- | --- | --- |
| `maarkn.dev` updates origin | `apps/web/src/routes.ts`, tests | Replaced by the server in the Worker |
| `maarkn.dev` assets URL | `ota-development.yml`, README | Removed; assets default to `https://remoteharness.app/api/updates/assets/` |
| `maarkn.dev` in examples | `update-manifest.test.ts` | Kept: it tests `updatesBase` with any URL shape (not a runtime link); changed to a neutral host |
| `raw.githubusercontent.com` preview image | `apps/web/src/site.ts` | Served by the Worker at `/og.png` |
| `raw.githubusercontent.com` installers | `install.ps1`, Worker | Done in change 81 |
| `github.com/maarkN/remote-harness` | README, landing, docs, CLI | Stays: the repository, releases, security advisories |
| `claude-remote://` scheme | app config, pairing parser, daemon | App adds `remoteharness://` and accepts both; the daemon keeps printing `claude-remote://` (older app builds only know it) |
| Android channel id `claude-remote` | app, daemon push | Stays: renaming resets the user's channel settings; the visible name is translated |
| App `slug` `claude-remote` | `app.config.ts` | Stays: not user-visible; changing it changes the Expo project identity and the runtime fingerprint for no user benefit |
| Internal ids (`claude-remote` keychain service, hook headers, backup suffix, tmux session, systemd unit, storage keys, `claude-remote` CLI alias) | daemon, app | Stay: compatibility with existing installs (#85 tracks the rest of the legacy names) |
| `maarkn.dev` in archived OpenSpec changes and change 27 | `openspec/` | History; change 27's design gets a note pointing here |

## Goals / Non-Goals

**Goals:** no runtime dependency on `maarkn.dev`; installed builds keep their updates URL; the same publisher, CI workflow and certificate; the server keeps never holding the signing key.

**Non-Goals:** EAS Update; migrating the manifests stored on `maarkn.dev` (they reference assets there and are superseded by the next publish); changing the updates URL embedded in builds; serving builds made with the even older `https://maarkn.dev/api/claude-remote/updates/manifest` URL (that site keeps answering them until those builds are gone).

## Decisions

- **Worker + R2 (option B)** instead of Firebase Functions + Storage: the Worker already answers `/api/updates/*`, R2 egress is free, and there is no second platform to deploy or pay for. A new bucket `remote-harness-updates` keeps update files apart from the install links.
- **Storage layout**: `assets/<sha256 base64url>` (content type in the object's HTTP metadata, immutable) and, per publish, `manifests/<channel>/<platform>/<runtime>/<UTC stamp>-<id>.json` (history) plus `latest/<channel>/<platform>/<runtime>.json` (what the manifest endpoint reads with one `get`; written after the history entry). Stored value: `{ manifest, signature }`, the exact signed string.
- **Ported behavior** (pure modules with Vitest, `apps/web/src/updates/`): request parsing (`expo-protocol-version` 1 or absent, platform `ios|android`, runtime `[\w.-]{1,128}`, channel `[a-z][a-z0-9-]{0,31}` not a platform name, default `production`), 400 / 406 errors, `204` with headers when nothing is published, multipart `manifest` part with `expo-signature`, or `application/expo+json` when the client only accepts JSON, `expo-protocol-version: 1`, `expo-sfv-version: 0`, `cache-control: private, max-age=0`, and `expo-manifest-filters: channel="<channel>"` on every manifest answer.
- **Publishing**: `Authorization: Bearer` compared in constant time over SHA-256 digests; `UPDATES_TOKEN` publishes to any channel, `UPDATES_DEV_TOKEN` to `development` and assets only (403 for another channel). Without either secret, publish routes answer 404. Assets are checked against their hash (SHA-256 of the body, `crypto.subtle`) and limited to 50 MB; manifests are validated with Zod (UUID id, ISO date, runtime matching the body, at most 2000 assets, every asset URL ending in `/api/updates/assets/<its hash>` and already stored), else 400 / 409.
- **Asset URLs** signed into manifests become `https://remoteharness.app/api/updates/assets/<hash>` (the publisher's default), so the CI workflow and README drop `REMOTE_HARNESS_UPDATES_ASSETS_URL`. The variable stays supported for other servers.
- **Secrets declared** in `cloudflare.config.ts` (`bindings.secret()`), so their names are typed and checked on deploy; values are set with the Cloudflare CLI, never in the repository. The production value is the publish token already used locally; the development token is the one in the GitHub secret `OTA_DEV_TOKEN` (rotated together when needed).
- **Preview image**: `docs/brand/og.png` bundled into the Worker (`?inline`) and served at `/og.png` with a one-day cache; the meta tags point to `https://remoteharness.app/og.png`.
- **Scheme**: `scheme: ['remoteharness', 'claude-remote']` (native change, part of the next build); `parsePairingUrl` accepts both. The daemon switches to `remoteharness://` in a later change.

## Risks / Trade-offs

- Until updates are published to the new server, apps get `204` (no update) where the old server had one; the release publishes both channels right after the deploy, and the development channel is published by CI on the next merge.
- Merging into `development` before the Worker is deployed makes the CI publish of that merge fail (the old server refuses asset URLs outside its own path); it passes again after the deploy.
- The 50 MB asset limit and the 2000-asset manifest limit match the old server; a Hermes bundle is a few MB.
