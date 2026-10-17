## Decisions

- **Redirects in the zone, logic in a Worker.** Plain redirects (www, installers, fallback to the repository) are zone redirect rules; the fallback rule excludes `/api/updates/` and `/ios/`, which go to the Worker routes.
- **OTA proxy, not a migration.** The Expo Updates server keeps running where it is; the Worker forwards `/api/updates/<rest>` to `/api/claude-remote/updates/<rest>` with method, headers and body, without following redirects. Signed manifests embed asset URLs, so manifests published for the new URL point to `remoteharness.app` and old ones keep pointing to the old origin.
- **Paths come from the updates URL.** `updatesBase(url)` drops the trailing `/manifest`; assets are `<base>/assets/<hash>` and manifests are posted to `<base>/manifests`, so the old and the new URL both work.
- **iPhone builds in R2 under a capability URL.** iOS installs from `itms-services` without cookies, so Access cannot protect it; a random token (kept in `IOS_LINK_DIR/.web-token`) is the path prefix and the Worker serves only `index.html`, `manifest.plist` and the IPA under it.
- **Runtime switch.** The updates URL is part of the runtime version, so builds switch to the new URL only when rebuilt; to reach older builds, publish once more with the old URL.
