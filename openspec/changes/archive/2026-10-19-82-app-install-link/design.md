## Context

`scripts/ios-link.mts --web` exports a development-signed IPA, writes `manifest.plist` and a static `index.html`, and uploads the three files to R2 (`remote-harness-ios` bucket) under `<token>/`, where `<token>` (24+ random base64url characters) lives in `<IOS_LINK_DIR>/.web-token` and is reused. The `apps/web` Worker serves `/ios/<token>/<file>` from that bucket for those three names only. There is no Android equivalent; the Android release build is only installed over USB (`make install-android`).

## Goals / Non-Goals

**Goals:** one link per machine for both phones; the right button first; both builds reachable from any device; no change to the token model.

**Non-Goals:** store distribution (#161); signing the APK with a dedicated upload key (the release build keeps the prebuild's signing, so updates install over each other from the same machine); a tailnet mode for Android; expiring links.

## Decisions

- **Rendered by the Worker, not uploaded HTML.** The publishers upload `builds.json` (`{ ios?: { version, build, builtAt, title, bundleId }, android?: { version, versionCode, builtAt, size } }`) last, after the binaries, so the page never links to a file that is not there yet. Each publisher merges its own entry into the local copy in `<IOS_LINK_DIR>/builds.json` and uploads it. The Worker validates the JSON (unknown fields ignored, bad entries dropped) and renders the page; without `builds.json` it serves the folder's legacy `index.html`, so links published before keep working.
- **Paths.** `/app/<token>/` is the link printed from now on. `/ios/<token>/` serves the same page and files, so bookmarks and older `manifest.plist` files keep working. Files: `RemoteHarness.ipa`, `RemoteHarness.apk`, `manifest.plist`. `index.html` and the empty name are the page; `builds.json` itself is not served.
- **Device classification** is a pure function over the user agent: `iPhone`/`iPad`/`iPod` → `ios`; `Android` → `android`; anything else → `desktop`. iPadOS Safari sends a macOS user agent, so the page also runs a two-line script: a Mac user agent with `navigator.maxTouchPoints > 1` switches the page to the iOS view. The server sets `data-device` on `<body>`; CSS shows the matching card. `?all=1` (the "Not your device?" link) renders every option and the QR code, without JavaScript.
- **QR code** of the page URL (without the query) rendered as inline SVG by `uqr` (small, dependency-free), shown in the desktop and all-options views only.
- **Self-contained page.** No external fonts or scripts, `referrer-policy: no-referrer` and `x-robots-tag: noindex`, `cache-control: no-cache`: the token must not leak through a `Referer` or an index, and a new build must show at once.
- **Hints.** iOS: only devices registered in the Apple team can install, and iOS asks to turn on Developer Mode (Settings → Privacy & Security) the first time. Android: the browser asks to allow installing unknown apps; then open the downloaded file. Texts in the three web catalogs.
- **Android build.** `make install-android-link`: `android-link.mts --check` (Cloudflare login, Android SDK), `expo prebuild --platform android --clean`, `./gradlew assembleRelease`, then `android-link.mts <apk> <dir>`, which reads the version from `expo config` and the APK size, uploads `RemoteHarness.apk` and `builds.json`, and prints the link. The APK keeps the prebuild's release signing, which is the same for every build made on that machine.

## Risks / Trade-offs

- A desktop browser with a touch screen and a Mac user agent would switch to the iOS view; "Show all options" is one tap away.
- `builds.json` written by two publishers at once could lose an entry; they run by hand on one machine, and the next publish fixes it.
- The APK is signed with the prebuild's key, which other machines do not share: an APK built elsewhere does not update over it (Android says so). The README says to build the link from one machine.
