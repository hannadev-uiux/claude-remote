## 1. Worker

- [x] 1.1 `apps/web/src/app-link.ts`: `classifyDevice`, `parseBuilds`, page renderer (cards, hints, QR with `uqr`, all-options view, iPadOS switch); Vitest with iPhone, iPad desktop-mode, Android phone and tablet, macOS, Windows, Linux user agents, builds parsing and the page per device
- [x] 1.2 Routes `/app/<token>/` and `/ios/<token>/` (page, three files, 404 otherwise), page from `builds.json` or the legacy `index.html`, content types and headers; route tests
- [x] 1.3 Page texts in the three web catalogs (parity test)

## 2. Publishers

- [x] 2.1 `scripts/app-link-files.ts`: `builds.json` merge and the web constants, with tests; `ios-link.mts --web` writes and uploads its entry last and prints the `/app/` link
- [x] 2.2 `scripts/android-link.mts` and `make install-android-link` (check, prebuild, `assembleRelease`, upload APK then `builds.json`)

## 3. Docs

- [x] 3.1 README and contributing docs (install link for both phones); `pnpm check` and `openspec validate --strict`
