import { esc } from '../html.ts'
import { LOCALE_PATHS, type Locale, messagesFor } from '../i18n/index.ts'
import { docsPath, pageHead, siteFooter, siteHeader } from '../landing.ts'
import { DOC_SLUGS, DOCS, type DocRegistry, type DocSlug, docPath, negotiatedDocPath } from './content.ts'
import { parseFrontMatter, renderDocument } from './markdown.ts'

export type SearchEntry = { page: string; url: string; heading: string; text: string }

/** The page in `locale`, or the en-US one (`fallback: true`); `null` when no language has it. */
export function resolveDoc(
  registry: DocRegistry,
  locale: Locale,
  slug: DocSlug,
): { raw: string; fallback: boolean } | null {
  const own = registry[locale][slug]
  if (own) return { raw: own, fallback: false }
  const english = registry['en-US'][slug]
  return english ? { raw: english, fallback: true } : null
}

function titleOf(registry: DocRegistry, locale: Locale, slug: DocSlug): string {
  const resolved = resolveDoc(registry, locale, slug)
  return resolved ? parseFrontMatter(resolved.raw).meta.title : slug
}

/** Every section of the language's pages, for the client-side search. */
export function searchIndex(registry: DocRegistry, locale: Locale): SearchEntry[] {
  const entries: SearchEntry[] = []
  for (const slug of DOC_SLUGS) {
    const resolved = resolveDoc(registry, locale, slug)
    if (!resolved) continue
    const doc = renderDocument(resolved.raw)
    for (const section of doc.sections) {
      entries.push({
        page: doc.meta.title,
        url: `${docPath(locale, slug)}${section.id ? `#${section.id}` : ''}`,
        heading: section.heading || doc.meta.title,
        text: section.text,
      })
    }
  }
  return entries
}

/** Filters the embedded index as the visitor types; two characters at least, twelve hits at most. */
const SEARCH_SCRIPT = `(function(){
var el=document.getElementById('docindex'),input=document.getElementById('docsearch'),list=document.getElementById('docresults');if(!el||!input||!list)return;
var index=JSON.parse(el.textContent||'[]'),empty=list.getAttribute('data-empty')||'';
input.addEventListener('input',function(){var q=input.value.trim().toLowerCase();list.innerHTML='';if(q.length<2){list.hidden=true;return}
var hits=index.filter(function(s){return (s.heading+' '+s.text+' '+s.page).toLowerCase().indexOf(q)!==-1}).slice(0,12);
if(!hits.length){var none=document.createElement('li');none.className='none';none.textContent=empty;list.appendChild(none)}
hits.forEach(function(s){var li=document.createElement('li'),a=document.createElement('a'),small=document.createElement('small');a.href=s.url;a.textContent=s.heading;small.textContent=s.page;a.appendChild(small);li.appendChild(a);list.appendChild(li)});
list.hidden=false})})();`

export type DocRenderOptions = { registry?: DocRegistry; path?: string }

/** A docs page; `path` is the URL served (the negotiated `/docs/…` or the language's own). `null` = no such page. */
export function renderDoc(locale: Locale, slug: DocSlug, options: DocRenderOptions = {}): string | null {
  const registry = options.registry ?? DOCS
  const resolved = resolveDoc(registry, locale, slug)
  if (!resolved) return null
  const doc = renderDocument(resolved.raw)
  const m = messagesFor(locale)
  const d = m.docs
  const path = options.path ?? docPath(locale, slug)
  const position = DOC_SLUGS.indexOf(slug)
  const previous = DOC_SLUGS[position - 1]
  const next = DOC_SLUGS[position + 1]
  const nav = DOC_SLUGS.map(
    (s) =>
      `<li><a href="${docPath(locale, s)}"${s === slug ? ' aria-current="page"' : ''}>${esc(titleOf(registry, locale, s))}</a></li>`,
  ).join('')
  const toc = doc.headings
    .filter((h) => h.level === 2)
    .map((h) => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`)
    .join('')
  const applies = doc.meta.applies
    ? `<p class="applies">${esc(d.applies.replace('{{version}}', doc.meta.applies))}</p>`
    : ''
  const notice = resolved.fallback ? `<p class="fallback" role="note">${esc(d.fallback)}</p>` : ''
  const pager = `<nav class="pn" aria-label="${esc(d.pages)}">${
    previous
      ? `<a class="prev" href="${docPath(locale, previous)}"><small>${esc(d.previous)}</small>${esc(titleOf(registry, locale, previous))}</a>`
      : '<span></span>'
  }${
    next
      ? `<a class="next" href="${docPath(locale, next)}"><small>${esc(d.next)}</small>${esc(titleOf(registry, locale, next))}</a>`
      : ''
  }</nav>`
  const title =
    slug === 'index'
      ? `${doc.meta.title} · Remote Harness`
      : `${doc.meta.title} · ${d.title} · Remote Harness`
  const index = JSON.stringify(searchIndex(registry, locale)).replace(/</g, '\\u003c')
  return `<!doctype html>
<html lang="${locale}">
<head>
${pageHead(locale, path, title, doc.meta.description, { pathFor: (l) => docPath(l, slug), xDefault: negotiatedDocPath(slug) })}
</head>
<body>
<a class="skip" href="#main">${esc(m.nav.skip)}</a>
${siteHeader(locale, m, {
  pathFor: (l) => docPath(l, slug),
  nav: [
    { href: LOCALE_PATHS[locale], label: d.home },
    { href: docsPath(locale), label: d.title, current: true },
  ],
})}
<main class="gutter" id="main"><div class="in docs">
  <aside class="side">
    <form class="search" role="search" onsubmit="return false"><input type="search" id="docsearch" placeholder="${esc(d.search)}" aria-label="${esc(d.search)}" autocomplete="off"><ul class="results" id="docresults" data-empty="${esc(d.noResults)}" hidden></ul></form>
    <nav aria-label="${esc(d.pages)}"><ul class="docnav">${nav}</ul></nav>
  </aside>
  <article>
    ${notice}
    <h1>${esc(doc.meta.title)}</h1>
    ${applies}
${doc.html}
    ${pager}
  </article>
  <nav class="toc" aria-label="${esc(d.onThisPage)}"><h2>${esc(d.onThisPage)}</h2><ul>${toc}</ul></nav>
</div></main>
<div class="gutter docs-foot"><div class="in">${siteFooter(locale, m)}</div></div>
<script type="application/json" id="docindex">${index}</script>
<script>${SEARCH_SCRIPT}</script>
</body>
</html>
`
}
