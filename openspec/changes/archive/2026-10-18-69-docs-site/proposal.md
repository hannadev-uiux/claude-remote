## Why

All user documentation lives in the repository README: long, developer-oriented, English only. Issue #136 (epic #162) wants an organized place to learn how to install, pair, use and troubleshoot Remote Harness, in the three languages, linked from the landing (#135), the app (Settings → App → Documentation) and the tray.

## What Changes

- **Docs under `/docs/`**, served by the same `apps/web` Worker as the landing: Markdown pages kept in the repository (`apps/web/content/<locale>/<slug>.md`, with a small front matter for the title, the description and an "applies to" note), bundled into the Worker at build time and rendered with `marked`. Seven pages per language: overview, getting started, using the app, the daemon, security & privacy, troubleshooting, contributing.
- **Same language model as the landing**: `/docs/…` negotiates from `Accept-Language`; `/en/docs/…`, `/pt-br/docs/…`, `/es/docs/…` are fixed; switcher, `hreflang`, canonical, Open Graph tags; a page missing in a language falls back to en-US with a notice.
- **Reading experience**: sidebar with the pages, the current page's headings as anchors, previous / next links, client-side search over an index of the current language's sections (no service), the landing's dark/light tokens and fonts.
- **Links**: the landing's Docs links, the app's Settings → App → Documentation and the tray's Documentation item point at `/docs/`; the sitemap lists the docs pages; the README gets a pointer to the docs (its user sections shrink after the site is live).
- **Checks**: tests render every page in every language, compare the page sets across languages, and verify that every internal link and anchor resolves (the CI link check the issue asks for).

## Non-goals

A documentation framework (Starlight, VitePress): one Worker, one renderer, one stylesheet are enough for seven pages; versioned docs beyond the "applies to" notes; screenshots (the pages describe, the landing shows).

## Capabilities

### New
- `web-docs`

### Modified
- `web-landing`

## Impact

`apps/web` (`content/`, `src/docs/`, `routes.ts`, `index.ts`, `landing.ts` links, `styles.ts`, `site.ts`, tests, `package.json` with `marked`), `apps/mobile/src/features/settings` (documentation URL), `apps/daemon/src/features/updates` (tray documentation URL), `README.md`.
