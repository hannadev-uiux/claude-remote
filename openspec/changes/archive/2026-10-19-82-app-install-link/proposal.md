## Why

The app install link (`https://remoteharness.app/ios/<token>/`, `make install-ios-link IOS_LINK=web`) only offers the iOS `.ipa` (issue #132). An Android phone or a desktop browser opening it gets an iPhone-only page, and there is no equivalent link for the Android `.apk`.

## What Changes

- **One download link that detects the device**, `https://remoteharness.app/app/<token>/` (the old `/ios/<token>/` path keeps working and shows the same page):
  - iPhone and iPad (including iPadOS Safari, which reports itself as a Mac) see the iOS install button (`itms-services://…manifest.plist`) and the hints for development-signed builds (registered device, Developer Mode);
  - Android phones and tablets see a download button for the `.apk` and how to allow installs from the browser;
  - desktop and unknown browsers see both options and a QR code of the page to open it on the phone;
  - detection is only a hint: a "Not your device? Show all options" link always shows everything.
- **The page is rendered by the Worker** in pt-BR, en-US or es-ES (`Accept-Language`) from a small `builds.json` published next to the binaries, with each platform's version, build and date. A platform that was never published says so instead of offering a broken button. Folders published before this change (no `builds.json`) keep their static `index.html`.
- **`make install-android-link`** (`scripts/android-link.mts`): release APK (`expo prebuild` + `gradlew assembleRelease`) uploaded as `RemoteHarness.apk` to the same R2 token folder as the iOS build, and its entry in `builds.json`. `make install-ios-link IOS_LINK=web` adds the iOS entry the same way.
- The Worker serves only `RemoteHarness.ipa`, `RemoteHarness.apk`, `manifest.plist` and the page under a token, with the right content types (`application/vnd.android.package-archive` for the APK).
- The capability-URL model stays: the random token in the link is the only protection, it is reused between builds and pages are `noindex` and never cached.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `project-domain`: the install link serves iOS and Android builds and a device-aware page.

## Impact

`apps/web` (routes, device classification, page renderer, QR code with `uqr`, catalogs, tests), `apps/mobile/scripts` (`ios-link.mts`, new `android-link.mts`, shared pure helpers and tests), `Makefile`, README and the contributing docs.
