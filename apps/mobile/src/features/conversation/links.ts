export type TextSegment = { kind: 'text'; text: string } | { kind: 'link'; text: string; href: string }

export type LinkKind = 'web' | 'path' | 'other'
export type LinkTarget = { kind: LinkKind; value: string }
export type LinkAction = 'open' | 'copy' | 'share'

/** Schemes opened directly on tap; anything else is copy/share only. */
const WEB_SCHEMES = new Set(['http', 'https', 'mailto'])

/** Marks a markdown link target without a scheme (a file path) so the renderer keeps it as written. */
const PATH_SCHEME = 'rhpath:'

const BARE_URL = /(?:https?:\/\/|mailto:)[^\s<>"`]+/gi
const TRAILING = ".,:;!?'*_…"
const CLOSERS: Record<string, string> = { ')': '(', ']': '[', '}': '{' }

const count = (text: string, char: string) => text.split(char).length - 1

/** Drops sentence punctuation and unmatched closing brackets from the end of a bare URL. */
function trimUrl(raw: string): string {
  let url = raw
  for (;;) {
    const last = url.at(-1)
    if (!last) return url
    const opener = CLOSERS[last]
    if (TRAILING.includes(last) || (opener && count(url, last) > count(url, opener))) {
      url = url.slice(0, -1)
      continue
    }
    return url
  }
}

/** Splits text into plain parts and bare `http(s)://` / `mailto:` URLs. File paths are never links. */
export function splitLinks(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let cursor = 0
  for (const match of text.matchAll(BARE_URL)) {
    const start = match.index
    // `xhttps://…` is part of a word, not a URL.
    if (start > 0 && /[A-Za-z0-9]/.test(text[start - 1] ?? '')) continue
    const url = trimUrl(match[0])
    if (!/^(?:https?:\/\/|mailto:)./i.test(url)) continue
    if (start > cursor) segments.push({ kind: 'text', text: text.slice(cursor, start) })
    segments.push({ kind: 'link', text: url, href: url })
    cursor = start + url.length
  }
  if (cursor < text.length) segments.push({ kind: 'text', text: text.slice(cursor) })
  return segments
}

export const hasLinks = (text: string) => splitLinks(text).some((s) => s.kind === 'link')

/** Scheme of a URL, or null for a path (one-letter "schemes" are Windows drives). */
function schemeOf(href: string): string | null {
  return /^([a-z][a-z0-9+.-]+):/i.exec(href)?.[1]?.toLowerCase() ?? null
}

/** Markdown link target as the parser should keep it: paths get the marker scheme. */
export function tagLinkTarget(href: string): string {
  return schemeOf(href) === null ? `${PATH_SCHEME}${href}` : href
}

export function classifyLink(href: string): LinkTarget {
  if (href.toLowerCase().startsWith(PATH_SCHEME))
    return { kind: 'path', value: href.slice(PATH_SCHEME.length) }
  const scheme = schemeOf(href)
  if (scheme === null) return { kind: 'path', value: href }
  return { kind: scheme && WEB_SCHEMES.has(scheme) ? 'web' : 'other', value: href }
}

/** Long-press menu entries: only web links can be opened. */
export function linkActions(kind: LinkKind): LinkAction[] {
  return kind === 'web' ? ['open', 'copy', 'share'] : ['copy', 'share']
}
