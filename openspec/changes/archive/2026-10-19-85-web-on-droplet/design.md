## Context

`apps/web` is a Cloudflare Worker: `src/index.ts` routes every request (pure `route()`), renders pages, serves the installers bundled with Vite (`?raw`, `?inline`), answers `/api/updates/*` through `handleUpdates(request, path, store, tokens)` over an `UpdatesStore` interface (R2 implementation), and serves install-link folders straight from an R2 bucket. The droplet already runs Traefik v3 (`web` network, `websecure` entry point, `le` resolver with the TLS challenge) for two other sites, each a compose project with router labels.

## Goals / Non-Goals

**Goals:** same URLs and behavior for every route (installed builds keep their updates URL and certificate); one small container on the droplet; no secret in the repository; the publishers keep working with one environment variable.

**Non-Goals:** moving `push.remoteharness.app` (`apps/push-edge` stays a Worker); building the image in CI; keeping a Worker build of the site alongside.

## Decisions

- **`createApp(deps)` + thin entries.** The request handling moves from `index.ts` to `app.ts` unchanged, with `env.*` replaced by injected `updates: UpdatesStore`, `builds: BuildsStore` and `tokens`. `server.ts` is the only Node-specific code: it reads `PORT`, `DATA_DIR`, `UPDATES_TOKEN` and `UPDATES_DEV_TOKEN`, converts `IncomingMessage` to a `Request` (origin from `X-Forwarded-Proto` and `Host`, as set by Traefik) and streams the `Response` back, and closes gracefully on SIGTERM.
- **No HTTP framework.** Node 22 has `Request`, `Response` and web streams; a 60-line adapter is enough and keeps the bundle dependency-free.
- **Vite SSR build.** `vite build --ssr src/server.ts` keeps the `?raw` and `?inline` imports and bundles everything into `dist/server.js` with no `node_modules` at runtime, so the image is `node:22-alpine` plus one file.
- **File-system stores.** `FsUpdatesStore` keeps the R2 layout under `<data>/updates/` (`assets/<hash>` with its content type in `assets/<hash>.type`, `manifests/…` history, `latest/…` pointer written after the history entry). `FsBuildsStore` reads `<data>/app/<token>/<file>`. Every write goes to a temporary file in the same directory and is renamed. Keys are already validated by the router and the handler; the stores also refuse any key that resolves outside their root.
- **Publishers over SSH, not HTTP.** Only the owner publishes install links and already has SSH access; an upload endpoint would add a third token and a large-body route for no gain. Files are copied with `scp` to `<name>.part` and renamed with `ssh … mv`, `builds.json` last, so the page never offers a missing file.
- **Proxied DNS, SSL `full`.** Same as the owner's other zone: Cloudflare keeps serving the `www` and installer redirect rules and hides the droplet's address. Traefik's certificate is accepted in `full` mode even when the TLS challenge cannot renew behind the proxy.
- **New publish tokens.** The Worker secrets cannot be read back; new tokens are generated on the server into `<dir>/.env` (mode 600), the development one is also set as the `OTA_DEV_TOKEN` repository secret.

## Risks / Trade-offs

- [Single droplet, no edge cache] → pages are small and cached by Cloudflare (`public, max-age=600`); assets are immutable and cached for a year.
- [Disk on the droplet] → updates are content-addressed and small (tens of MB); install links keep one build per platform.
- [Cutover window] → the R2 contents are copied before the DNS change, and the Worker is removed only after the droplet answers the manifest of both platforms.
