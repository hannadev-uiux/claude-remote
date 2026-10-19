## ADDED Requirements

### Requirement: Landing page
`https://remoteharness.app/` SHALL serve a landing page rendered by the `apps/web` Worker, in the product identity (dark terminal theme first, light when the visitor's system prefers it, amber accent, JetBrains Mono for headings and UI text, IBM Plex Sans for running text), with these sections in order: hero (one-line pitch, lead, "Install on your machine" and "Get the app" calls to action, platform line, session-list mock), "Works with" agents strip, how it works (phone · machine · agents in tmux, three steps), features, privacy & security, install, docs & FAQ, and a footer with links (docs, GitHub, releases, security, license) and the trademark note. The page MUST be responsive from phone width up, keyboard-navigable with visible focus, and MUST NOT load scripts, pixels or analytics from third parties (fonts from Google Fonts are the only external resource).

#### Scenario: First visit
- **WHEN** a visitor opens `https://remoteharness.app/`
- **THEN** the landing page is returned with status 200, `text/html; charset=utf-8` and the sections above

#### Scenario: Light system theme
- **WHEN** the visitor's system prefers a light color scheme
- **THEN** the page renders with the light tokens without any switch

### Requirement: Language negotiation
The Worker SHALL render the page in pt-BR, en-US or es-ES. `/` SHALL pick the language from `Accept-Language` (q-values honoured; `pt*` → pt-BR, `es*` → es-ES, anything else → en-US) and answer with `Content-Language` and `Vary: Accept-Language`; `/en/`, `/pt-br/` and `/es/` SHALL always answer their language. Every page SHALL carry a language switcher linking to the three paths, `rel="alternate" hreflang` links for the three plus `x-default` pointing at `/`, and a canonical link. The three catalogs MUST have the same keys.

#### Scenario: Portuguese browser
- **WHEN** a browser sends `Accept-Language: pt-BR,pt;q=0.9,en;q=0.8` to `/`
- **THEN** the page comes in pt-BR with `Content-Language: pt-BR`

#### Scenario: Explicit path
- **WHEN** the same browser opens `/es/`
- **THEN** the page comes in es-ES

#### Scenario: Unknown language
- **WHEN** a browser sends `Accept-Language: fr`
- **THEN** the page comes in en-US

### Requirement: Discoverability
Each page SHALL have a translated `<title>` and meta description, Open Graph and Twitter card tags (type, title, description, URL, image `docs/brand/og.png`, locale), and a favicon (the mark as SVG at `/favicon.svg`, also served at `/favicon.ico`). The Worker SHALL serve `/sitemap.xml` listing `/`, `/en/`, `/pt-br/` and `/es/`, and `/robots.txt` allowing everything and naming the sitemap.

#### Scenario: Social preview
- **WHEN** a chat app unfurls `https://remoteharness.app/pt-br/`
- **THEN** it gets the Portuguese title and description and the brand image

#### Scenario: Sitemap
- **WHEN** a crawler fetches `/sitemap.xml`
- **THEN** it receives XML with the four URLs

### Requirement: Install section
The install section SHALL show the install command per operating system in tabs (macOS · Linux with `curl -fsSL https://remoteharness.app/install.sh | bash`, Windows with `irm https://remoteharness.app/install.ps1 | iex`), each with a copy button, the Windows tab preselected on Windows browsers, the requirements as chips (Node 24+ bundled when missing, tmux, git, ripgrep, Tailscale, `claude` on PATH), and the app cards (iPhone & iPad, Android) with the current way to get each build. Both commands MUST be present in the markup so the section works without JavaScript.

#### Scenario: Copy the command
- **WHEN** the visitor taps Copy next to the macOS · Linux command
- **THEN** the command is on the clipboard and the button briefly reads the translated "Copied"

#### Scenario: Windows visitor
- **WHEN** the page is opened from a Windows browser
- **THEN** the Windows tab is selected first

### Requirement: Other paths
The Worker SHALL keep the updates proxy and the iPhone install link exactly as they are, SHALL redirect `/install.sh` and `/install.ps1` (302) to the files on the `main` branch, and SHALL answer every other path with a small branded 404 page in the negotiated language that links to the landing and the repository.

#### Scenario: Old redirect path
- **WHEN** someone opens `/anything-else`
- **THEN** a 404 page in their language is returned, with links home and to GitHub

#### Scenario: Installer through the Worker
- **WHEN** `curl -fsSL https://remoteharness.app/install.sh` reaches the Worker
- **THEN** it is redirected to `https://raw.githubusercontent.com/maarkN/remote-harness/main/install.sh`
