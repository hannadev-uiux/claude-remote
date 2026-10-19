## MODIFIED Requirements

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
