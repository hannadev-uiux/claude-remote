import { describe, expect, test } from 'vitest'
import { DOC_SLUGS, DOCS, type DocRegistry, type DocSlug, docPath, isDocSlug } from '../src/docs/content.ts'
import { parseFrontMatter, renderDocument, renderMarkdown, slugify } from '../src/docs/markdown.ts'
import { renderDoc, resolveDoc, searchIndex } from '../src/docs/page.ts'
import { esc } from '../src/html.ts'
import { CATALOGS, WEB_LOCALES } from '../src/i18n/index.ts'
import { route } from '../src/routes.ts'
import { sitemapXml } from '../src/site.ts'

describe('markdown', () => {
  test('front matter: title, description, optional applies; the body follows', () => {
    const { meta, body } = parseFrontMatter(
      '---\ntitle: A page\ndescription: About it: twice\napplies: 0.7+\n---\n\n## One\n',
    )
    expect(meta).toEqual({ title: 'A page', description: 'About it: twice', applies: '0.7+' })
    expect(body).toBe('\n## One\n')
    expect(() => parseFrontMatter('## No front matter')).toThrow(/front matter/)
    expect(() => parseFrontMatter('---\ntitle: x\n---\n')).toThrow(/description/)
  })

  test('heading ids are slugified, accent-free and unique; the index follows the headings', () => {
    expect(slugify('Instalação no computador')).toBe('instalacao-no-computador')
    expect(slugify('Windows (WSL2)')).toBe('windows-wsl2')
    const doc = renderMarkdown(
      'Intro text.\n\n## Install\n\nRun `x`.\n\n## Install\n\nAgain [here](/en/docs/).\n\n### Sub *part*\n',
    )
    expect(doc.headings).toEqual([
      { level: 2, id: 'install', text: 'Install' },
      { level: 2, id: 'install-2', text: 'Install' },
      { level: 3, id: 'sub-part', text: 'Sub part' },
    ])
    expect(doc.html).toContain(
      '<h2 id="install">Install<a class="anchor" href="#install" aria-hidden="true">#</a></h2>',
    )
    expect(doc.html).toContain('<h3 id="sub-part">Sub <em>part</em>')
    expect(doc.sections).toEqual([
      { id: '', heading: '', text: 'Intro text.' },
      { id: 'install', heading: 'Install', text: 'Run x.' },
      { id: 'install-2', heading: 'Install', text: 'Again here.' },
      { id: 'sub-part', heading: 'Sub part', text: '' },
    ])
  })
})

describe('registry', () => {
  test('every language has every page, with front matter that parses', () => {
    for (const locale of WEB_LOCALES) {
      expect(Object.keys(DOCS[locale]).sort(), locale).toEqual([...DOC_SLUGS].sort())
      for (const slug of DOC_SLUGS) {
        const doc = renderDocument(DOCS[locale][slug] ?? '')
        expect(doc.meta.title, `${locale}/${slug}`).not.toBe('')
        expect(doc.headings.length, `${locale}/${slug}`).toBeGreaterThan(0)
      }
    }
    expect(isDocSlug('daemon')).toBe(true)
    expect(isDocSlug('nope')).toBe(false)
  })

  test('a page missing in a language falls back to en-US with a notice', () => {
    const registry: DocRegistry = {
      'en-US': { index: '---\ntitle: Docs\ndescription: d\n---\n\n## Hello\n' },
      'pt-BR': {},
      'es-ES': { index: '---\ntitle: Documentación\ndescription: d\n---\n\n## Hola\n' },
    }
    expect(resolveDoc(registry, 'pt-BR', 'index')).toEqual({ raw: registry['en-US'].index, fallback: true })
    expect(resolveDoc(registry, 'es-ES', 'index')?.fallback).toBe(false)
    expect(resolveDoc(registry, 'pt-BR', 'daemon')).toBeNull()
    const html = renderDoc('pt-BR', 'index', { registry }) ?? ''
    expect(html).toContain(CATALOGS['pt-BR'].docs.fallback)
    expect(html).toContain('<html lang="pt-BR">')
    expect(html).toContain('<h2 id="hello">')
    expect(renderDoc('pt-BR', 'daemon', { registry })).toBeNull()
  })
})

/** Internal links and anchors of a rendered page. */
function links(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)]
    .map((match) => match[1] ?? '')
    .filter((href) => href.startsWith('/') || href.startsWith('#'))
}

describe('renderDoc', () => {
  const pages = WEB_LOCALES.flatMap((locale) => DOC_SLUGS.map((slug) => ({ locale, slug })))

  test.each(pages)('$locale/$slug renders with its chrome and metadata', ({ locale, slug }) => {
    const html = renderDoc(locale, slug) ?? ''
    const doc = renderDocument(DOCS[locale][slug] ?? '')
    const d = CATALOGS[locale].docs
    expect(html).toContain(`<html lang="${locale}">`)
    expect(html).toContain(`<title>${esc(doc.meta.title)}`)
    expect(html).toContain(`<link rel="canonical" href="https://remoteharness.app${docPath(locale, slug)}">`)
    expect(html).toContain(`hreflang="es-ES" href="https://remoteharness.app${docPath('es-ES', slug)}"`)
    expect(html).toContain(`<a href="${docPath(locale, slug)}" aria-current="page">`)
    expect(html).toContain(`<h1>${esc(doc.meta.title)}</h1>`)
    expect(html).toContain(d.onThisPage)
    if (doc.meta.applies) expect(html).toContain(d.applies.replace('{{version}}', doc.meta.applies))
    expect(html).not.toContain(d.fallback)
    expect(html).not.toMatch(/undefined|\[object Object\]|\{\{/)
    const index = JSON.parse(
      /<script type="application\/json" id="docindex">([\s\S]*?)<\/script>/.exec(html)?.[1] ?? '[]',
    )
    expect(index.length).toBeGreaterThan(DOC_SLUGS.length)
  })

  test('every internal link and anchor on every page resolves', () => {
    const anchors = new Map<string, Set<string>>()
    for (const { locale, slug } of pages) {
      const doc = renderDocument(DOCS[locale][slug] ?? '')
      anchors.set(docPath(locale, slug), new Set(doc.headings.map((h) => h.id)))
    }
    const broken: string[] = []
    for (const { locale, slug } of pages) {
      const own = docPath(locale, slug)
      for (const href of links(renderDoc(locale, slug) ?? '')) {
        const [path = '', hash] = href.split('#')
        const target = path === '' ? own : path
        const resolved = route(target)
        if (resolved.kind === 'not-found' || (resolved.kind === 'doc' && !isDocSlug(resolved.slug))) {
          broken.push(`${own} → ${href}`)
          continue
        }
        if (hash !== undefined && hash !== 'main' && resolved.kind === 'doc') {
          const ids = anchors.get(target.endsWith('/') ? target : `${target}/`)
          if (!ids?.has(hash)) broken.push(`${own} → ${href}`)
        }
      }
    }
    expect(broken).toEqual([])
  })

  test('previous / next follow the slug order; the index has no previous page', () => {
    const first = renderDoc('en-US', 'index') ?? ''
    expect(first).toContain(`<a class="next" href="${docPath('en-US', 'getting-started')}">`)
    expect(first).not.toContain('class="prev"')
    const last = renderDoc('en-US', 'contributing') ?? ''
    expect(last).toContain(`<a class="prev" href="${docPath('en-US', 'troubleshooting')}">`)
    expect(last).not.toContain('class="next"')
  })

  test('search index entries point at pages and anchors of the same language', () => {
    const entries = searchIndex(DOCS, 'pt-BR')
    expect(entries.every((entry) => entry.url.startsWith('/pt-br/docs/'))).toBe(true)
    expect(entries.some((entry) => entry.text.toLowerCase().includes('tailscale'))).toBe(true)
  })

  test('the sitemap lists every docs page in every language', () => {
    const sitemap = sitemapXml()
    for (const { locale, slug } of pages) {
      expect(sitemap).toContain(`<loc>https://remoteharness.app${docPath(locale, slug as DocSlug)}</loc>`)
    }
  })
})
