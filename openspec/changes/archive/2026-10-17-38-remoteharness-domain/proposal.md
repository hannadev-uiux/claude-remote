## Why

The installers and the OTA update server live under a personal site (`maarkn.dev/claude-remote/...`), and installing a release build on the iPhone without a cable needs Tailscale on the phone. The project now owns **remoteharness.app** (issue #97).

## What Changes

- `remoteharness.app` on Cloudflare: `www` → apex, `/install.sh` and `/install.ps1` redirect to the files on `main`, anything else to the repository until there is a site.
- A Cloudflare Worker (`apps/web`) on `remoteharness.app/api/updates/*` proxies the Expo Updates protocol to the current server, so builds get a URL owned by the project and the server can move later without a new build.
- The same Worker serves iPhone release builds from an R2 bucket at `remoteharness.app/ios/<token>/`: install page, manifest and IPA, under a random token because a development-signed IPA embeds the registered device IDs.
- `make install-ios-link IOS_LINK=web` uploads the build there (Tailscale stays the default).
- Install commands, setup guide, hints, docs and specs point to `remoteharness.app`; the OTA scripts derive every path from `REMOTE_HARNESS_UPDATES_URL` instead of a fixed `/api/claude-remote/updates/` prefix.

The old `maarkn.dev` URLs keep working (installed builds still ask the old OTA URL).

## Capabilities

### New Capabilities
- `project-domain`: installers, OTA proxy and iPhone install links on remoteharness.app.

### Modified Capabilities

## Impact

New `apps/web` package (Worker, Vitest), `apps/mobile/scripts` (OTA publisher, iOS link), daemon and app i18n/setup guide, installers, Makefile, CI workflow, README and living specs. Cloudflare zone configuration (DNS, redirect rules, Worker routes, R2 bucket).
