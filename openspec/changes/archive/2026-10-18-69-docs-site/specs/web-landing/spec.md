## MODIFIED Requirements

### Requirement: Discoverability
Each page SHALL have a translated `<title>` and meta description, Open Graph and Twitter card tags (type, title, description, URL, image `docs/brand/og.png`, locale), and a favicon (the mark as SVG at `/favicon.svg`, also served at `/favicon.ico`). The Worker SHALL serve `/sitemap.xml` listing `/`, `/en/`, `/pt-br/`, `/es/` and every documentation page in every language, and `/robots.txt` allowing everything and naming the sitemap.

#### Scenario: Social preview
- **WHEN** a chat app unfurls `https://remoteharness.app/pt-br/`
- **THEN** it gets the Portuguese title and description and the brand image

#### Scenario: Sitemap
- **WHEN** a crawler fetches `/sitemap.xml`
- **THEN** it receives XML with the four landing URLs and the docs pages
