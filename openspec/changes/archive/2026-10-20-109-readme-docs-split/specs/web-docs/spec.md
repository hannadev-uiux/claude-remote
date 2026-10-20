## MODIFIED Requirements

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
