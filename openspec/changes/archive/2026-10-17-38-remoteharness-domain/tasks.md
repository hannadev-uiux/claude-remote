## 1. Cloudflare

- [x] 1.1 DNS for apex and `www`, Always Use HTTPS, redirect rules (www, installers, fallback to the repository)
- [x] 1.2 `apps/web` Worker: routing (pure, tested), updates proxy, R2 file serving; routes on `remoteharness.app/api/updates/*` and `/ios/*`; fallback rule excludes them
- [x] 1.3 R2 bucket and binding for iPhone builds

## 2. OTA

- [x] 2.1 `updatesBase` in `update-manifest.ts` (tests) and the publisher derive paths from the updates URL
- [x] 2.2 CI workflow and docs use `https://remoteharness.app/api/updates/manifest`

## 3. iPhone link

- [x] 3.1 `ios-link.mts` web mode (token, R2 upload) and `IOS_LINK=web` in the Makefile

## 4. URLs

- [x] 4.1 Installers, daemon i18n, app setup guide, README and living specs use `remoteharness.app`; Makefile local defaults renamed with fallback

## 5. Verification

- [x] 5.1 `pnpm check` green; redirects, proxy and install link checked against the live domain
