## Context

`apps/web` is a Cloudflare Worker configured with the `cf` CLI (`cloudflare.config.ts`): two fetch triggers (`/api/updates/*`, `/ios/*`), an R2 binding, pure routing in `routes.ts` tested with Vitest. The zone's redirect rules answer `www`, `/install.sh`, `/install.ps1` (to the raw files on `main`) and, as a fallback, everything else to the repository. The `cf` config used here has no static-assets option, and the repository has no HTML build step. The prototype is `docs/design/identity/screens/landing.html` (+ `shared.css`, `shared.js`).

## Decisions

1. **The Worker renders the page; no site generator.** The landing is one page in three languages: a TypeScript template (`landing.ts`) fed by typed catalogs is enough, keeps the "pure function + Vitest" convention (the render is tested for every locale), and avoids a second toolchain and a static-assets pipeline the `cf` config does not offer. Responses carry `Cache-Control: public, max-age=600`; the page is tiny.

2. **Language: negotiated at `/`, explicit everywhere else.** `pickLocale(acceptLanguage)` parses the header with its q-values and maps `pt*` → pt-BR, `es*` → es-ES, anything else → en-US. `/` answers in that language with `Vary: Accept-Language` and `Content-Language`; `/en/`, `/pt-br/` and `/es/` always answer their language, so the switcher links are stable and crawlable. Every page lists the three as `hreflang` alternates with `x-default` on `/`, and `sitemap.xml` lists the four URLs. Catalogs follow the app's rule: `en-US` is the reference type, the other two must have the same keys (a parity test walks them).

3. **Binary assets without an asset pipeline.** The favicon is the mark as inline SVG served at `/favicon.svg` (and `/favicon.ico`, same bytes: browsers ask for it blindly); the Open Graph image is `docs/brand/og.png` from the repository's `main` branch on `raw.githubusercontent.com`, which serves PNG with the right type. When a static-assets option lands in `cf`, both move next to the Worker without changing the page.

4. **Fonts from Google Fonts, nothing else third-party.** JetBrains Mono and IBM Plex Sans come from Google Fonts with `preconnect` and `display=swap`, as in the prototype; there is no script, pixel or analytics from anyone. Self-hosting the fonts is the one thing that would need the asset pipeline above.

5. **Markup from strings, safely.** Catalog texts are plain strings escaped on output; a minimal inline syntax (`` `code` `` → `<code>`, `[label](url)` → `<a>`) covers the few rich spots (commands, links to SECURITY.md and the README) without putting HTML in the catalogs.

6. **Small inline script only for comfort.** Tabs for the install command (preselecting Windows from the user agent), the copy buttons (translated "Copied" through a `data-copied` attribute) and nothing else; the page works fully without JavaScript (both commands are in the markup, the tabs only hide one).

7. **Routes.** `route()` gains `page` (with the locale or `null` for negotiation), `sitemap`, `robots`, `favicon`, `installer` (302 to the raw file on `main`, mirroring the zone rule so the Worker can own the zone) and keeps `updates`, `ios`, `not-found`. Unknown paths get a branded 404 in the negotiated language instead of the old redirect to the repository.

8. **Honest content.** The copy says what ships today: Claude Code with every profile, OpenRouter-backed profiles, Codex / Kimi / Qwen marked as coming; the iPhone card points at the README's build instructions until #161 (TestFlight), the Android card at GitHub Releases; "Docs" points at the README until #136.

## Manual steps (not in the repository)

- `pnpm --filter @remote-harness/web deploy` (`cf deploy`) publishes the Worker with the new trigger.
- In the zone's redirect rules, delete the fallback that sends everything to the repository (keep `www` and the installer rules, which the Worker also mirrors). Redirect rules run before Workers, so the landing is not reachable until this is done.

## Alternatives rejected

- Astro / VitePress: a whole toolchain for one page, and the docs site (#136) can still pick one later and live under `/docs/` behind the same Worker.
- Redirecting `/` to `/en/` by language: an extra hop for every visitor and a worse canonical story than negotiating in place.
- Inlining `og.png` as base64 in the Worker: hundreds of kilobytes in every request's bundle for a crawler-only asset.
