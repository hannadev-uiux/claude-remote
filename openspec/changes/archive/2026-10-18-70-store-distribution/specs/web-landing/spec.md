## MODIFIED Requirements

### Requirement: Landing page
`https://remoteharness.app/` SHALL serve a landing page rendered by the `apps/web` Worker, in the product identity (dark terminal theme first, light when the visitor's system prefers it, amber accent, JetBrains Mono for headings and UI text, IBM Plex Sans for running text), with these sections in order: hero (one-line pitch, lead, "Install on your machine" and "Get the app" calls to action, platform line, session-list mock), "Works with" agents strip, how it works (phone · machine · agents in tmux, three steps), features, privacy & security, install, docs & FAQ, and a footer with links (docs, GitHub, releases, security, privacy policy, license) and the trademark note. The page MUST be responsive from phone width up, keyboard-navigable with visible focus, and MUST NOT load scripts, pixels or analytics from third parties (fonts from Google Fonts are the only external resource).

#### Scenario: First visit
- **WHEN** a visitor opens `https://remoteharness.app/`
- **THEN** the landing page is returned with status 200, `text/html; charset=utf-8` and the sections above

#### Scenario: Light system theme
- **WHEN** the visitor's system prefers a light color scheme
- **THEN** the page renders with the light tokens without any switch

#### Scenario: Privacy link
- **WHEN** the visitor looks at the footer
- **THEN** a Privacy link opens the privacy policy page in the page's language
