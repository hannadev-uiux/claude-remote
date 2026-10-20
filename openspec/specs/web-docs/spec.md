# web-docs Specification

## Purpose
TBD - created by archiving change 69-docs-site. Update Purpose after archive.

## Requirements

### Requirement: Documentation pages
The `apps/web` Worker SHALL serve user documentation under `/docs/`, rendered from Markdown pages kept in the repository (`apps/web/content/<locale>/<slug>.md`) with a front matter of `title`, `description` and an optional `applies` version note. The pages SHALL be, in this order: overview (`/docs/`), getting started, using the app, the daemon, security & privacy, privacy policy, troubleshooting, contributing. Each page SHALL show a sidebar with the pages, the current page's headings as anchors, previous / next links, and SHALL use the landing's tokens and fonts (dark first, light by system preference). Headings MUST have stable ids so anchors can be linked.

#### Scenario: Open a page
- **WHEN** a visitor opens `/en/docs/getting-started/`
- **THEN** the page renders with its title, its sections, the sidebar marking it as current and links to the previous and next pages

#### Scenario: Version note
- **WHEN** a page's front matter has `applies: 0.7+`
- **THEN** the note "Applies to 0.7+" (translated) is shown under the title

#### Scenario: Privacy policy
- **WHEN** a visitor opens `/pt-br/docs/privacy/`
- **THEN** the privacy policy renders in Portuguese between security & privacy and troubleshooting in the sidebar

### Requirement: Documentation languages
Docs SHALL follow the landing's language model: `/docs/…` negotiates from `Accept-Language` (with `Vary: Accept-Language`), `/en/docs/…`, `/pt-br/docs/…` and `/es/docs/…` are fixed, each page carries the language switcher, `hreflang` alternates and a canonical link. The three languages MUST have the same set of pages; a page missing in a language SHALL be rendered from en-US with a notice saying so.

#### Scenario: Portuguese reader
- **WHEN** a browser with `Accept-Language: pt-BR` opens `/docs/daemon/`
- **THEN** the Portuguese page is returned with `Content-Language: pt-BR`

#### Scenario: Untranslated page
- **WHEN** a language has no file for a slug
- **THEN** the English page is shown with a notice that the translation is pending

### Requirement: Documentation search
Each docs page SHALL offer a search field that filters an embedded index of the current language's sections (page title, heading, text) as the visitor types, listing matching headings as links to their anchors, without calling any service.

#### Scenario: Search a term
- **WHEN** the visitor types "tailscale" on any docs page
- **THEN** the sections whose heading or text mention it are listed, each linking to its page and anchor

### Requirement: Documentation links and checks
The landing's Docs links, the app's Settings → App → Documentation and the tray's Documentation item SHALL open the docs; the sitemap SHALL list every docs page in every language; the README SHALL point to the docs. A test SHALL render every page in every language and verify that every internal link and anchor resolves.

The docs SHALL be the only user guide. `README.md` SHALL keep what the project is (pitch, screenshots, status, features, how it works), a short security summary, the one-line install, links from each user topic (install per system, pairing, the app, the daemon and its config file, notifications, updates, security, troubleshooting, uninstall) to its docs page, development, contributing and license. `README.pt-BR.md` SHALL follow the same outline in Portuguese, linking `/pt-br/docs/`. Developer-only topics (building and signing the app, Makefile targets, Firebase for self-built apps, the push relay deploy, over-the-air publishing, the website deploy) SHALL live in `CONTRIBUTING.md`. Texts elsewhere (docs pages, landing) MUST NOT send users to the README for a user topic.

#### Scenario: Broken link
- **WHEN** a page links to `/en/docs/missing/` or to an anchor no heading has
- **THEN** the test suite fails naming the page and the link

#### Scenario: Unknown page
- **WHEN** a visitor opens `/docs/nothing-here/`
- **THEN** the branded 404 page is returned

#### Scenario: WSL setup from the README
- **WHEN** a reader looks for the WSL2 notes in the README
- **THEN** they find a link to the getting-started and troubleshooting pages of the docs, not a copy of the notes

#### Scenario: Deploying the push relay
- **WHEN** a contributor looks for how to deploy the push relay
- **THEN** the steps are in `CONTRIBUTING.md`, and the README links there from its development section
