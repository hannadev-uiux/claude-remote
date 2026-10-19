## MODIFIED Requirements

### Requirement: Discoverability
Each page SHALL have a translated `<title>` and meta description, Open Graph and Twitter card tags (type, title, description, URL, image `https://remoteharness.app/og.png`, locale), and a favicon (the mark as SVG at `/favicon.svg`, also served at `/favicon.ico`). The Worker SHALL serve the brand image (`docs/brand/og.png`, bundled at build time) at `/og.png`, `/sitemap.xml` listing `/`, `/en/`, `/pt-br/`, `/es/` and every documentation page in every language, and `/robots.txt` allowing everything and naming the sitemap.

#### Scenario: Social preview
- **WHEN** a chat app unfurls `https://remoteharness.app/pt-br/`
- **THEN** it gets the Portuguese title and description and the brand image from `https://remoteharness.app/og.png`

#### Scenario: Sitemap
- **WHEN** a crawler fetches `/sitemap.xml`
- **THEN** it receives XML with the four landing URLs and the docs pages

### Requirement: Other paths
The Worker SHALL answer `/api/updates/*` as the updates server and the app install link as their requirements say, SHALL answer `/install`, `/install.sh` and `/install.ps1` as the installer URLs require, and SHALL answer every other path with a small branded 404 page in the negotiated language that links to the landing and the repository.

#### Scenario: Old redirect path
- **WHEN** someone opens `/anything-else`
- **THEN** a 404 page in their language is returned, with links home and to GitHub

#### Scenario: Installer through the Worker
- **WHEN** `curl -fsSL https://remoteharness.app/install.sh` reaches the Worker
- **THEN** it receives the bundled `install.sh` as `text/plain`, without a redirect
