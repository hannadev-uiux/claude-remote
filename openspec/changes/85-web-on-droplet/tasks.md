## 1. Server

- [x] 1.1 `apps/web/src/app.ts` (`createApp` with injected stores and tokens) from the Worker entry; `BuildsStore` interface
- [x] 1.2 File-system stores (`FsUpdatesStore`, `FsBuildsStore`) with atomic writes and a root guard; tests on a temporary directory
- [x] 1.3 `src/server.ts` (Node adapter, forwarded origin, graceful shutdown); test that starts it on a free port and exercises a page, an installer, the updates round trip and an install-link file
- [x] 1.4 Vite SSR build, package scripts and tsconfig without the Worker; remove `index.ts`, `cloudflare.config.ts` and the R2 store

## 2. Deploy

- [x] 2.1 `apps/web/deploy/` Dockerfile and compose file (Traefik labels, `web` network, non-root, health check, data volume, `.env`)
- [x] 2.2 Deploy script and `make deploy-web` (build, copy over SSH, data folder ownership, restart, health check)

## 3. Publishers and docs

- [x] 3.1 Install-link publishers upload over SSH (`REMOTE_HARNESS_WEB_SSH`, `REMOTE_HARNESS_WEB_DIR`); tests for the pure parts
- [x] 3.2 README, CLAUDE.md, Makefile help, contributing and privacy pages in three languages

## 4. Verify and cut over

- [x] 4.1 `pnpm check` and `openspec validate --strict`
- [ ] 4.2 Deploy to the droplet, copy the R2 contents, check every route through the droplet before the DNS change
- [ ] 4.3 DNS to the droplet, remove the fallback redirect rule and the Worker, new publish tokens (server `.env`, `OTA_DEV_TOKEN`); check the live site, the manifest of both platforms and the install link
