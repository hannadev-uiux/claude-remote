## Why

Issue #161 (epic #162) wants the app on TestFlight / the App Store and Google Play with the new identity. Most of it happens outside the repository (Apple Developer Program enrollment, App Store Connect, Play Console, review) and is blocked on the enrollment, but the repository can prepare everything the stores will ask for, so the submission is a matter of pasting and uploading.

## What Changes

- **Store listing texts** as a typed catalog in pt-BR, en-US and es-ES (`apps/mobile/store/metadata.ts`): name, subtitle, short and full descriptions, keywords, promotional text, release notes, support, marketing and privacy URLs, agent-neutral copy. A test checks the three languages have the same shape, respect the stores' length limits and point at URLs the site serves. A script writes them in fastlane's `metadata/` layout (iOS and Android), ready for `fastlane deliver` / `supply` or copy-paste.
- **Store assets** from the brand script: a Google Play feature graphic (1024 × 500) next to the existing 1024 icon.
- **Privacy policy page** in the docs (`/docs/privacy/`), the URL both stores require, in the three languages, plus a link in the landing footer; the support URL is the troubleshooting page.
- **Migration note** in the docs for users of the development-signed builds (install the store build, pair again, push re-registers).
- The issue keeps the owner's checklist (enrollment, App ID for the new bundle id from #83, APNs key, App Store Connect, TestFlight group, review notes, nutrition labels, Play Console, Play Integrity, screenshots).

## Non-goals

Changing the bundle id and scheme (#83, a decision with its own migration); EAS Submit credentials and `eas.json` submit profiles (they need the owner's identifiers); screenshots (need devices and the final identity on them).

## Capabilities

### New
- `store-distribution`

### Modified
- `web-docs`, `web-landing`

## Impact

`apps/mobile/store/` (new), `apps/mobile/scripts/{icons.mts,store-metadata.mts,store-metadata.test.ts}`, `apps/mobile/package.json` (script), `apps/web/content/*/privacy.md`, `apps/web/content/*/troubleshooting.md`, `apps/web/src/docs/content.ts`, `apps/web/src/landing.ts`, web catalogs.
