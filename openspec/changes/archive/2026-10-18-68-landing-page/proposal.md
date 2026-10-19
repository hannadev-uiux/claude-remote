## Why

`remoteharness.app` has no home page: the zone's redirect rules send `/` (and every path the Worker does not claim) to the GitHub repository, so a new user lands on a README written for developers. Issue #135 (epic #162) wants a landing page in the product's identity that explains the app and gets people to install it, in the three languages.

## What Changes

- **Worker** (`apps/web`): renders the landing page itself, from a TypeScript template and typed catalogs (pt-BR, en-US, es-ES), at `/` (language negotiated from `Accept-Language`, `Vary` set) and at `/en/`, `/pt-br/`, `/es/`; serves `sitemap.xml`, `robots.txt` and the SVG favicon; answers unknown paths with a small branded 404 and keeps the updates proxy and the iPhone install link untouched. `/install.sh` and `/install.ps1` get the same redirect the zone rules do today, so the Worker can take the whole zone.
- **Page**: hero with the session-list mock, "Works with" strip, how it works (phone · machine · agents in tmux, three steps), features, privacy & security, install (OS tabs with a copy button, requirements, app cards), docs & FAQ, footer with the trademark note. Dark first, light through `prefers-color-scheme`, JetBrains Mono for headings and UI, IBM Plex Sans for running text; responsive and keyboard-accessible; Open Graph / Twitter card, canonical and `hreflang` links.
- **Deploy**: `cloudflare.config.ts` adds the `remoteharness.app/*` trigger. Going live still needs two manual steps the repository cannot do: `cf deploy`, and removing the zone's redirect-to-repository fallback (the installer and `www` rules stay).

## Non-goals

The documentation site (#136, it will link from the header, the FAQ and the footer, which point to the README until then); the OS-detecting `/install` URL (#131) and the device-detecting app link (#132); analytics of any kind; a theme switcher (the system preference decides).

## Capabilities

### New
- `web-landing`

### Modified
- `project-domain`

## Impact

`apps/web/src` (`routes.ts`, `index.ts`, new `i18n/`, `html.ts`, `styles.ts`, `landing.ts`, `site.ts`), `apps/web/test`, `apps/web/cloudflare.config.ts`.
