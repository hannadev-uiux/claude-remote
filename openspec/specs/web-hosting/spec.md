# web-hosting Specification

## Purpose
TBD - created by archiving change 85-web-on-droplet. Update Purpose after archive.

## Requirements

### Requirement: Site server
`remoteharness.app` SHALL be served by a Node server built from `apps/web` (`dist/server.js`, bundled by Vite with no runtime dependencies) that answers every route the `web-landing`, `web-docs`, `updates-server` and `project-domain` capabilities describe. It SHALL read its port, data directory and publish tokens from the environment, build the request origin from the `X-Forwarded-Proto` and `Host` headers, and stop accepting connections and exit on SIGTERM once the open requests finish.

#### Scenario: Same answers as before
- **WHEN** a client requests the landing, a docs page, `/install`, `/api/updates/manifest` or an install-link page
- **THEN** the server answers with the same status, headers and body the Worker answered

#### Scenario: Graceful stop
- **WHEN** the container is stopped during a request
- **THEN** that request completes and the process exits

### Requirement: Data directory
Updates and install links SHALL be stored under the server's data directory: `updates/assets/<hash>` with the asset's content type next to it, `updates/manifests/<channel>/<platform>/<runtime>/<stamp>-<id>.json` for every publish and `updates/latest/<channel>/<platform>/<runtime>.json` written after it, and `app/<token>/<file>` for install links. Every write MUST go to a temporary file in the same directory and be renamed into place, and a store MUST refuse a key that resolves outside its root.

#### Scenario: Interrupted publish
- **WHEN** the server stops while an asset is being written
- **THEN** no partial asset is ever served under its hash

#### Scenario: Path outside the root
- **WHEN** a store is asked for a key with `..` segments
- **THEN** it answers as if the file did not exist and touches nothing

### Requirement: Docker deploy
`apps/web/deploy/` SHALL hold a Dockerfile (Node 22 Alpine, non-root user, health check) and a compose file that joins the external `web` network and declares a Traefik router for `Host(\`remoteharness.app\`)` on the `websecure` entry point with the `le` certificate resolver, mounts `./data` as the data directory and reads the publish tokens from `.env` next to it. `make deploy-web` SHALL build the bundle, copy it with the deploy files to `REMOTE_HARNESS_WEB_SSH:REMOTE_HARNESS_WEB_DIR` without touching `.env` or `data/`, make the data directory writable by the container user, rebuild and restart the container and fail unless it reports healthy. The repository MUST NOT contain the tokens or the server's address.

#### Scenario: Deploy
- **WHEN** the owner runs `make deploy-web` with `REMOTE_HARNESS_WEB_SSH` set
- **THEN** the new bundle is live behind Traefik and the previous data is untouched

#### Scenario: Missing host
- **WHEN** `REMOTE_HARNESS_WEB_SSH` is not set
- **THEN** the command stops before building, naming the variable
