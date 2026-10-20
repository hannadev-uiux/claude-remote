## Why

`remoteharness.app` is meant to run on infrastructure the owner already operates (issue #234): a droplet with Docker and Traefik (Let's Encrypt) that hosts the owner's other sites. Today the site is a Cloudflare Worker with its files in R2, deployed with the `cf` CLI, and it is not live yet: the zone still redirects every page but the updates server and the install links to the repository.

## What Changes

- **Node server instead of the Worker.** The same routes, pages, installers, updates server and install link, behind a `createApp` that receives its storage and tokens; a Node HTTP entry (`apps/web/src/server.ts`) runs it. The Worker entry, `cloudflare.config.ts` and the R2 store are removed.
- **Files on a volume instead of R2.** Updates (`updates/assets`, `updates/manifests`, `updates/latest`, same layout as the R2 keys) and install-link folders (`app/<token>/`) live under one data directory, written atomically (temporary file, then rename).
- **Docker deploy behind the droplet's Traefik.** `apps/web/deploy/` holds the Dockerfile and a compose file (network `web`, router for `remoteharness.app`, certificate resolver `le`, non-root user, health check). `make deploy-web` builds the bundle with Vite, copies it with the deploy files over SSH and restarts the container. The publish tokens live in a `.env` on the server, never in the repository.
- **Install-link publishers upload over SSH.** `make install-ios-link IOS_LINK=web` and `make install-android-link` copy the build into the server's data directory (`REMOTE_HARNESS_WEB_SSH`, `REMOTE_HARNESS_WEB_DIR`) instead of `cf r2 objects put`; every file is copied under a temporary name and renamed, `builds.json` last.
- **Cutover (operations, not code):** copy the R2 contents to the volume, point `remoteharness.app` at the droplet (proxied, SSL mode `full` like the owner's other zone), remove the zone's fallback redirect rule and the Worker (its routes go with it), and set new publish tokens on the server and in the `OTA_DEV_TOKEN` repository secret. The `www` and installer redirect rules stay. `push.remoteharness.app` (`apps/push-edge`) is unchanged.

## Capabilities

### New Capabilities
- `web-hosting`: how the site runs and is deployed (Node server, data directory, Docker behind Traefik, deploy command).

### Modified Capabilities
- `project-domain`: the updates server and the install link are answered by the site server from its data directory, and the publishers upload over SSH.

## Impact

`apps/web` (entry points, file-system stores, Vite build, package scripts, deploy files, tests), `apps/mobile/scripts` (install-link upload), `Makefile`, README, CLAUDE.md, the contributing and privacy docs pages (three languages). Operations on the droplet and the `remoteharness.app` zone.
