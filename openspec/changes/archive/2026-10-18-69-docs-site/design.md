## Context

Change 68 made the `apps/web` Worker render the landing from a TypeScript template and typed catalogs, with language negotiation at `/` and fixed paths per language. The Worker is bundled by Vite (`cf build`); there is no static-assets option in the `cf` config used here, and the repository has no site generator. The docs are seven pages per language, written by the maintainers.

## Decisions

1. **Markdown in the repository, bundled into the Worker.** Pages live in `apps/web/content/<locale>/<slug>.md` and are imported with Vite's `?raw` suffix (supported by the Worker build and by Vitest), so the Worker ships the text and renders it on request with `marked`, cached like the landing. No generator, no asset pipeline, and the pages are reviewed as plain Markdown in pull requests. A `modules.d.ts` declares the `*.md?raw` imports for TypeScript.

2. **Front matter, minimal.** Each page starts with `title`, `description` and optionally `applies` (the version note the issue asks for, rendered under the title); `order` comes from a fixed slug list in code, so the navigation is the same in every language. Headings get stable ids (slugified text) so anchors work across languages that keep the same structure, and the ids feed the "on this page" list and the search index.

3. **Language like the landing.** `/docs/` and `/docs/<slug>/` negotiate from `Accept-Language` (`Vary` set); `/<lang>/docs/…` are fixed. When a language lacks a page, the en-US page is rendered with a notice at the top (the mechanism is tested with a synthetic registry; every page ships translated). The three languages must have the same slugs, checked by a test.

4. **Search without a service.** Each page embeds a JSON index of the current language's sections (page title, heading, id, text) in a `<script type="application/json">`; a small inline script filters it as the visitor types and lists matching headings as links. Seven pages fit in a few tens of kilobytes; it works offline and sends nothing anywhere.

5. **Link check as a test.** A Vitest test renders every page in every language, collects every internal link (`/…`) and anchor (`#…`) and asserts that each resolves to a route the Worker answers with 200 and, for anchors, to a heading id on the target page. That is the CI check for broken links; external links are not fetched.

6. **Where the links point.** The landing's Docs links go to the language's `/docs/`; the app's Settings → App → Documentation and the tray's Documentation open `https://remoteharness.app/docs/` (negotiated); the README gains a pointer at the top. Shrinking the README's user sections waits for the site to be live, so nobody is left without docs in between.

7. **Honest content.** The pages describe what ships: Claude Code profiles (including OpenRouter-backed ones), the app's features as implemented, the CLI commands that exist (`remote-harness --help` is the source of truth), the security model from SECURITY.md and the README, and the known limitations (Android notification actions, sessions outside tmux, TestFlight pending).

## Alternatives rejected

- Astro Starlight / VitePress: a second toolchain, its own theme to re-skin, and a static output the current `cf` config cannot serve next to the Worker.
- Rendering Markdown at build time into HTML strings: the same `marked` dependency either way, and runtime rendering keeps one code path for the fallback notice and the search index.
- Fetching the Markdown from GitHub at request time: a dependency on another host for every page view, and no way to test the links offline.
