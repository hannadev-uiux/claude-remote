## 1. Content

- [x] 1.1 `apps/web/content/{en-US,pt-BR,es-ES}/`: `index`, `getting-started`, `using-the-app`, `daemon`, `security`, `troubleshooting`, `contributing` with front matter

## 2. Worker

- [x] 2.1 `src/docs/`: registry of the pages (`?raw` imports), front matter + `marked` rendering with heading ids, page layout (sidebar, on-this-page, previous/next, fallback notice, search index and script), `styles.ts` additions
- [x] 2.2 `routes.ts` (`doc` kind, negotiated and fixed), `index.ts` dispatch, `site.ts` sitemap with the docs pages, landing links to `/docs/`

## 3. Links elsewhere

- [x] 3.1 App Settings → App → Documentation and the tray Documentation item already open `https://remoteharness.app/docs` (now served); README pointer added

## 4. Tests

- [x] 4.1 Routes, front matter parsing, heading ids, fallback notice, same slugs across languages, every page renders, internal links and anchors resolve, sitemap

## 5. Verification

- [x] 5.1 `pnpm check` green (turbo + Biome in the worktree); `openspec validate --strict`
