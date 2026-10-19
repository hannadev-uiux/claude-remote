export const WEB_LOCALES = ['en-US', 'pt-BR', 'es-ES'] as const
export type Locale = (typeof WEB_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en-US'

/** Fixed path of each language's page; `/` negotiates from `Accept-Language`. */
export const LOCALE_PATHS: Record<Locale, string> = { 'en-US': '/en/', 'pt-BR': '/pt-br/', 'es-ES': '/es/' }

/** The locale a fixed path names (`/pt-br`, `/pt-br/`, `/pt/`, `/es/`, `/en/`…), or `null` for other paths. */
export function localeFromPath(pathname: string): Locale | null {
  const segment = pathname.replace(/^\/+|\/+$/g, '').toLowerCase()
  if (segment === 'en' || segment === 'en-us') return 'en-US'
  if (segment === 'pt' || segment === 'pt-br') return 'pt-BR'
  if (segment === 'es' || segment === 'es-es') return 'es-ES'
  return null
}

/** Our language for a BCP 47 tag (`pt-PT` is still Portuguese, `es-MX` Spanish), or `null`. */
function localeForTag(tag: string): Locale | null {
  const language = tag.trim().toLowerCase().split('-')[0] ?? ''
  if (language === 'pt') return 'pt-BR'
  if (language === 'es') return 'es-ES'
  if (language === 'en') return 'en-US'
  return null
}

/** Best of our languages for an `Accept-Language` header (q-values honoured); en-US when none matches. */
export function pickLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE
  const ranked = acceptLanguage
    .split(',')
    .map((part, index) => {
      const [tag = '', ...params] = part.split(';')
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='))
      const weight = q ? Number(q.slice(2)) : 1
      return { tag: tag.trim(), weight: Number.isFinite(weight) ? weight : 0, index }
    })
    .filter((entry) => entry.tag !== '' && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index)
  for (const entry of ranked) {
    if (entry.tag === '*') return DEFAULT_LOCALE
    const locale = localeForTag(entry.tag)
    if (locale) return locale
  }
  return DEFAULT_LOCALE
}
