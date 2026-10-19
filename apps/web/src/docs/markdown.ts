import { Marked, type Tokens } from 'marked'

export type FrontMatter = { title: string; description: string; applies?: string }
export type Heading = { level: number; id: string; text: string }
/** One searchable unit: the text under a heading (the page's intro has the page title as heading). */
export type Section = { id: string; heading: string; text: string }
export type RenderedDoc = { meta: FrontMatter; html: string; headings: Heading[]; sections: Section[] }

/** `title`, `description` and the optional `applies` note between the leading `---` lines. */
export function parseFrontMatter(raw: string): { meta: FrontMatter; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!match) throw new Error('missing front matter')
  const fields: Record<string, string> = {}
  for (const line of (match[1] ?? '').split(/\r?\n/)) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    fields[line.slice(0, colon).trim()] = line.slice(colon + 1).trim()
  }
  const title = fields.title
  const description = fields.description
  if (!title || !description) throw new Error('front matter needs title and description')
  const meta: FrontMatter = { title, description }
  if (fields.applies) meta.applies = fields.applies
  return { meta, body: raw.slice(match[0].length) }
}

/** `Install on the computer` → `install-on-the-computer`; accents dropped so anchors match across languages. */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Markdown syntax stripped for the search index and the heading text. */
function plain(text: string): string {
  return text
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Renders a page body with GFM, stable heading ids and a per-heading text index. */
export function renderMarkdown(body: string): Omit<RenderedDoc, 'meta'> {
  const headings: Heading[] = []
  const ids = new Map<string, number>()
  const idFor = (text: string): string => {
    const base = slugify(text) || 'section'
    const seen = ids.get(base) ?? 0
    ids.set(base, seen + 1)
    return seen === 0 ? base : `${base}-${seen + 1}`
  }
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth }: Tokens.Heading) {
        const text = plain(this.parser.parseInline(tokens, this.parser.textRenderer))
        const id = idFor(text)
        headings.push({ level: depth, id, text })
        return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}<a class="anchor" href="#${id}" aria-hidden="true">#</a></h${depth}>\n`
      },
    },
  })
  const html = marked.parse(body, { async: false })
  // The index follows the heading order the renderer just produced: same lexer, same walk.
  const sections: Section[] = []
  let current: Section = { id: '', heading: '', text: '' }
  let index = 0
  for (const token of marked.lexer(body)) {
    if (token.type === 'heading') {
      if (current.text || current.heading) sections.push(current)
      const heading = headings[index++]
      current = { id: heading?.id ?? '', heading: heading?.text ?? plain(token.text), text: '' }
      continue
    }
    if (token.type === 'space') continue
    const text = plain('text' in token && typeof token.text === 'string' ? token.text : token.raw)
    if (text) current.text = `${current.text} ${text}`.trim().slice(0, 700)
  }
  if (current.text || current.heading) sections.push(current)
  return { html, headings, sections }
}

export function renderDocument(raw: string): RenderedDoc {
  const { meta, body } = parseFrontMatter(raw)
  return { meta, ...renderMarkdown(body) }
}
