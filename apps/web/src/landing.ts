import { esc, inline } from './html.ts'
import { LOCALE_PATHS, type Locale, messagesFor, WEB_LOCALES, type WebMessages } from './i18n/index.ts'
import { INSTALL_COMMANDS } from './install.ts'
import { MARK_REGULAR, OG_IMAGE_URL, REPO_URL, SITE_URL } from './site.ts'
import { STYLES } from './styles.ts'

const OG_LOCALES: Record<Locale, string> = { 'en-US': 'en_US', 'pt-BR': 'pt_BR', 'es-ES': 'es_ES' }
const LANG_CODES: Record<Locale, string> = { 'en-US': 'EN', 'pt-BR': 'PT', 'es-ES': 'ES' }
const LANG_NAMES: Record<Locale, string> = { 'en-US': 'English', 'pt-BR': 'Português', 'es-ES': 'Español' }

export { INSTALL_COMMANDS }

/** The language's documentation root (`/en/docs/`). */
export function docsPath(locale: Locale): string {
  return `${LOCALE_PATHS[locale]}docs/`
}

/** Where the app links go until the stores exist (#161). */
export const LINKS = {
  ios: `${REPO_URL}#readme`,
  android: `${REPO_URL}/releases`,
  releases: `${REPO_URL}/releases`,
  security: `${REPO_URL}/blob/main/SECURITY.md`,
  license: `${REPO_URL}/blob/main/LICENSE`,
} as const

const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;1,400&family=IBM+Plex+Sans:wght@400;500;600&display=swap'

export function mark(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 256 256" aria-hidden="true" focusable="false">${MARK_REGULAR}</svg>`
}

/** The same page in another language, for the alternates and the switcher. */
export type PathFor = (locale: Locale) => string
const landingPath: PathFor = (locale) => LOCALE_PATHS[locale]

/** `<head>` of every page: metadata, alternates of this page in each language, fonts, styles. */
export function pageHead(
  locale: Locale,
  path: string,
  title: string,
  description: string,
  { pathFor = landingPath, xDefault = '/' }: { pathFor?: PathFor; xDefault?: string } = {},
): string {
  const url = `${SITE_URL}${path}`
  const alternates = WEB_LOCALES.map(
    (l) => `<link rel="alternate" hreflang="${l}" href="${SITE_URL}${pathFor(l)}">`,
  ).join('\n')
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
${alternates}
<link rel="alternate" hreflang="x-default" href="${SITE_URL}${xDefault}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Remote Harness">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${OG_IMAGE_URL}">
<meta property="og:locale" content="${OG_LOCALES[locale]}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${OG_IMAGE_URL}">
<meta name="theme-color" content="#0d0d0d">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS_URL}">
<style>${STYLES}</style>`
}

export function languageSwitch(locale: Locale, m: WebMessages, pathFor: PathFor = landingPath): string {
  const links = WEB_LOCALES.map((l) => {
    const current = l === locale ? ' aria-current="page"' : ''
    return `<a href="${pathFor(l)}" hreflang="${l}" lang="${l}" title="${LANG_NAMES[l]}"${current}>${LANG_CODES[l]}</a>`
  }).join('')
  return `<div class="lang" role="navigation" aria-label="${esc(m.nav.language)}">${links}</div>`
}

export type NavLink = { href: string; label: string; current?: boolean }

/** Sticky header: brand, section or page links, language switcher, GitHub. */
export function siteHeader(
  locale: Locale,
  m: WebMessages,
  { pathFor = landingPath, nav }: { pathFor?: PathFor; nav: NavLink[] },
): string {
  const links = nav
    .map(
      (link) => `<a href="${link.href}"${link.current ? ' aria-current="page"' : ''}>${esc(link.label)}</a>`,
    )
    .join('')
  return `<header class="top gutter"><div class="in">
  <a class="brand" href="${LOCALE_PATHS[locale]}">${mark(24)}Remote Harness</a>
  <nav aria-label="${esc(m.nav.menu)}">${links}</nav>
  ${languageSwitch(locale, m, pathFor)}
  <a class="gh" href="${REPO_URL}">${esc(m.nav.github)} ↗</a>
</div></header>`
}

export function siteFooter(locale: Locale, m: WebMessages): string {
  const f = m.footer
  const languages = WEB_LOCALES.map((l) => LANG_NAMES[l]).join(' · ')
  return `<footer>
  <div class="row"><span class="brand">${mark(20)}Remote Harness</span><a href="${docsPath(locale)}">${esc(f.docs)}</a><a href="${REPO_URL}">${esc(f.github)}</a><a href="${LINKS.releases}">${esc(f.releases)}</a><a href="${LINKS.security}">${esc(f.security)}</a><a href="${docsPath(locale)}privacy/">${esc(f.privacy)}</a><a href="${LINKS.license}">${esc(f.license)}</a><span class="langs">${languages}</span></div>
  <small>${esc(f.legal)}</small>
</footer>`
}

function landingNav(locale: Locale, m: WebMessages): NavLink[] {
  return [
    { href: '#how', label: m.nav.how },
    { href: '#features', label: m.nav.features },
    { href: '#security', label: m.nav.security },
    { href: '#install', label: m.nav.install },
    { href: docsPath(locale), label: m.nav.docs },
  ]
}

function phoneMock(m: WebMessages): string {
  const mock = m.mock
  const states = mock.states as Record<string, string>
  const profiles = mock.profiles as Record<string, string>
  const chips = mock.filters
    .map((f, i) => `<span class="chip${i === 0 ? ' on' : ''}">${esc(f)}</span>`)
    .join('')
  const rows = mock.sessions
    .map((s) => {
      const branch = s.branch ? `<span>⎇ ${esc(s.branch)}</span>` : ''
      return `<div class="srow${s.state === 'waiting' ? ' waiting' : ''}"><div class="t"><span class="agent claude">cl</span><span class="title">${esc(s.title)}</span><span class="ago">${esc(s.ago)}</span></div><div class="p"><span>${esc(s.folder)}</span>${branch}</div><div class="m"><span class="pill ${esc(s.state)}">${esc(states[s.state] ?? s.state)}</span><span class="ptag ${esc(s.profile)}">${esc(profiles[s.profile] ?? s.profile)}</span></div></div>`
    })
    .join('')
  return `<div class="phone" role="img" aria-label="${esc(m.hero.mockLabel)}">
  <div class="sb"><span>9:41</span><span class="ic">▮▮▮ ⌔ ▭</span></div>
  <div class="app" aria-hidden="true">
    <div class="ah"><div class="title">${mark(20)}${esc(mock.title)}</div><div class="ib accent">+</div><div class="ib">⚙</div></div>
    <div class="mline"><span class="dot"></span><span class="host">${esc(mock.host)}</span><span>${esc(mock.count)}</span></div>
    <div class="chips">${chips}</div>
    <div class="scroll">
      <div class="attn"><div class="h">⚠ ${esc(mock.waiting)} <span>${esc(mock.timer)}</span></div><div class="who"><span class="agent claude">cl</span><span>${esc(mock.permission.title)}</span></div><div class="tool">${esc(mock.permission.tool)} · <b>${esc(mock.permission.command)}</b></div><div class="ans"><span class="no">${esc(mock.deny)}</span><span>${esc(mock.always)}</span><span class="ok">${esc(mock.allow)}</span></div></div>
      ${rows}
    </div>
  </div>
  <div class="home"></div>
</div>`
}

function hero(m: WebMessages): string {
  return `<section class="hero">
  <div class="copy">
    <span class="eyebrow">${esc(m.hero.eyebrow)}</span>
    <h1>${esc(m.hero.title)}</h1>
    <p class="lead">${esc(m.hero.lead)}</p>
    <div class="ctas"><a class="btn primary" href="#install">${esc(m.hero.install)}</a><a class="btn" href="#app">${esc(m.hero.app)}</a></div>
    <div class="meta"><span>${esc(m.hero.platforms)}</span><span aria-hidden="true">→</span><span>${esc(m.hero.phones)}</span><span aria-hidden="true">·</span><span>${esc(m.hero.terms)}</span></div>
  </div>
  <div class="shot">${phoneMock(m)}</div>
</section>`
}

function agents(m: WebMessages): string {
  const a = m.agents
  return `<div class="agents" aria-label="${esc(a.label)}">
  <span class="lbl">${esc(a.label)}</span>
  <span class="agchip"><span class="agent claude" aria-hidden="true">cl</span>${esc(a.claude)}</span>
  <span class="agchip plain">${esc(a.openrouter)} <small>${esc(a.openrouterNote)}</small></span>
  <span class="agchip soon"><span class="agent codex" aria-hidden="true">cx</span>${esc(a.codex)} <small>${esc(a.soon)}</small></span>
  <span class="agchip soon"><span class="agent kimi" aria-hidden="true">ki</span>${esc(a.kimi)} <small>${esc(a.soon)}</small></span>
  <span class="agchip soon"><span class="agent qwen" aria-hidden="true">qw</span>${esc(a.qwen)} <small>${esc(a.soon)}</small></span>
</div>`
}

function how(m: WebMessages): string {
  const h = m.how
  const aliases = h.agents.aliases
    .map((alias) => `<span><span class="agent claude" aria-hidden="true">cl</span>${esc(alias)}</span>`)
    .join('')
  const steps = h.steps
    .map((s) => `<li class="step"><div><b>${esc(s.title)}</b><p>${inline(s.body)}</p></div></li>`)
    .join('')
  return `<section class="s" id="how">
  <div class="head"><span class="eyebrow">${esc(h.eyebrow)}</span><h2>${esc(h.title)}</h2><p>${esc(h.lead)}</p></div>
  <div class="how">
    <div class="node"><div class="ic" aria-hidden="true">📱</div><h3>${esc(h.phone.title)}</h3><p>${inline(h.phone.body)}</p></div>
    <div class="link" aria-hidden="true"><span>${esc(h.link1.top)}</span><i></i><span>${esc(h.link1.bottom)}</span></div>
    <div class="node"><div class="ic" aria-hidden="true">💻</div><h3>${esc(h.machine.title)}</h3><p>${inline(h.machine.body)}</p></div>
    <div class="link" aria-hidden="true"><span>${esc(h.link2.top)}</span><i></i><span>${esc(h.link2.bottom)}</span></div>
    <div class="node"><div class="ic" aria-hidden="true">▣</div><h3>${esc(h.agents.title)}</h3><p>${inline(h.agents.body)}</p><div class="win">${aliases}</div></div>
  </div>
  <ol class="steps">${steps}</ol>
</section>`
}

function features(m: WebMessages): string {
  const items = m.features.items
    .map(
      (f) =>
        `<div class="feat"><span class="g" aria-hidden="true">${esc(f.glyph)}</span><h3>${esc(f.title)}</h3><p>${inline(f.body)}</p></div>`,
    )
    .join('')
  return `<section class="s" id="features">
  <div class="head"><span class="eyebrow">${esc(m.features.eyebrow)}</span><h2>${esc(m.features.title)}</h2></div>
  <div class="feats">${items}</div>
</section>`
}

function security(m: WebMessages): string {
  const items = m.security.items
    .map(
      (s) =>
        `<div class="it"><i aria-hidden="true">✓</i><div><b>${esc(s.title)}</b><span>${inline(s.body)}</span></div></div>`,
    )
    .join('')
  return `<section class="s" id="security">
  <div class="head"><span class="eyebrow">${esc(m.security.eyebrow)}</span><h2>${esc(m.security.title)}</h2></div>
  <div class="sec2">${items}</div>
</section>`
}

export function command(text: string, m: WebMessages): string {
  const [bin = '', ...rest] = text.split(' ')
  const pipe = rest.indexOf('|')
  const highlighted =
    pipe === -1
      ? `<b>${esc(bin)}</b> ${esc(rest.join(' '))}`
      : `<b>${esc(bin)}</b> ${esc(rest.slice(0, pipe).join(' '))} | <b>${esc(rest.slice(pipe + 1).join(' '))}</b>`
  return `<div class="cmd"><code>${highlighted}</code><button type="button" data-copy="${esc(text)}" data-copied="${esc(m.install.copied)}" aria-label="${esc(m.install.copyLabel)}">${esc(m.install.copy)}</button></div>`
}

function install(m: WebMessages): string {
  const i = m.install
  const reqs = i.requirements.map((r) => `<li><span>${esc(r)}</span></li>`).join('')
  return `<section class="s" id="install">
  <div class="head"><span class="eyebrow">${esc(i.eyebrow)}</span><h2>${esc(i.title)}</h2></div>
  <div class="install">
    <div class="col">
      <div class="tabs" role="tablist"><button type="button" role="tab" class="on" aria-selected="true" data-tab="unix" id="tab-unix" aria-controls="pane-unix">${esc(i.tabUnix)}</button><button type="button" role="tab" aria-selected="false" data-tab="windows" id="tab-windows" aria-controls="pane-windows">${esc(i.tabWindows)}</button></div>
      <div class="pane" role="tabpanel" id="pane-unix" aria-labelledby="tab-unix" data-pane="unix">${command(INSTALL_COMMANDS.unix, m)}<p class="note">${inline(i.unixNote)}</p></div>
      <div class="pane" role="tabpanel" id="pane-windows" aria-labelledby="tab-windows" data-pane="windows" hidden>${command(INSTALL_COMMANDS.windows, m)}<p class="note">${inline(i.windowsNote)}</p></div>
      <noscript><style>.pane[hidden] { display: flex; }</style></noscript>
      <ul class="reqs">${reqs}</ul>
    </div>
    <div class="stores" id="app">
      <h3>${esc(i.appTitle)}</h3>
      <a class="store" href="${LINKS.ios}"><span class="ic" aria-hidden="true"></span><span><b>${esc(i.ios.title)}</b><small>${esc(i.ios.detail)}</small></span></a>
      <a class="store" href="${LINKS.android}"><span class="ic" aria-hidden="true">▲</span><span><b>${esc(i.android.title)}</b><small>${esc(i.android.detail)}</small></span></a>
      <p class="note">${inline(i.appNote)}</p>
    </div>
  </div>
</section>`
}

function faq(m: WebMessages): string {
  const items = m.faq.items
    .map(
      (f, index) =>
        `<details${index === 0 ? ' open' : ''}><summary>${esc(f.q)}</summary><p>${inline(f.a)}</p></details>`,
    )
    .join('')
  return `<section class="s" id="docs">
  <div class="head"><span class="eyebrow">${esc(m.faq.eyebrow)}</span><h2>${esc(m.faq.title)}</h2><p>${inline(m.faq.lead)}</p></div>
  <div class="faq">${items}</div>
</section>`
}

/** Tabs (Windows preselected on Windows browsers) and copy buttons; the page works without it. */
export const SCRIPT = `(function(){
var tabs=document.querySelectorAll('[data-tab]'),panes=document.querySelectorAll('[data-pane]');
function select(name){tabs.forEach(function(t){var on=t.getAttribute('data-tab')===name;t.classList.toggle('on',on);t.setAttribute('aria-selected',on?'true':'false')});panes.forEach(function(p){p.hidden=p.getAttribute('data-pane')!==name})}
tabs.forEach(function(t){t.addEventListener('click',function(){select(t.getAttribute('data-tab'))})});
if(/Windows/i.test(navigator.userAgent))select('windows');
document.querySelectorAll('[data-copy]').forEach(function(b){b.addEventListener('click',function(){var text=b.getAttribute('data-copy')||'',old=b.textContent;function done(){b.textContent=b.getAttribute('data-copied')||old;setTimeout(function(){b.textContent=old},1400)}
if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(done,done);else done()})});
})();`

/** The landing page in `locale`; `path` is the URL being served (`/` or the language's own path). */
export function renderLanding(locale: Locale, path: string = LOCALE_PATHS[locale]): string {
  const m = messagesFor(locale)
  return `<!doctype html>
<html lang="${locale}">
<head>
${pageHead(locale, path, m.meta.title, m.meta.description)}
</head>
<body>
<a class="skip" href="#main">${esc(m.nav.skip)}</a>
${siteHeader(locale, m, { nav: landingNav(locale, m) })}
<main class="gutter" id="main"><div class="in">
${hero(m)}
${agents(m)}
${how(m)}
${features(m)}
${security(m)}
${install(m)}
${faq(m)}
${siteFooter(locale, m)}
</div></main>
<script>${SCRIPT}</script>
</body>
</html>
`
}

/** Small branded 404 in the negotiated language, linking home and to the repository. */
export function renderNotFound(locale: Locale): string {
  const m = messagesFor(locale)
  return `<!doctype html>
<html lang="${locale}">
<head>
${pageHead(locale, LOCALE_PATHS[locale], `${m.notFound.title} · Remote Harness`, m.notFound.body)}
<meta name="robots" content="noindex">
</head>
<body>
${siteHeader(locale, m, { nav: landingNav(locale, m) })}
<main class="gutter" id="main"><div class="in nf">
  <span class="code">404</span>
  <h1>${esc(m.notFound.title)}</h1>
  <p class="lead">${esc(m.notFound.body)}</p>
  <div class="ctas"><a class="btn primary" href="${LOCALE_PATHS[locale]}">${esc(m.notFound.home)}</a><a class="btn" href="${REPO_URL}">${esc(m.notFound.github)}</a></div>
</div></main>
</body>
</html>
`
}
