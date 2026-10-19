import { DOC_SLUGS, docPath } from './docs/content.ts'
import { LOCALE_PATHS, WEB_LOCALES } from './i18n/locale.ts'

export const SITE_URL = 'https://remoteharness.app'
export const REPO_URL = 'https://github.com/maarkN/remote-harness'
/** The author, credited at the bottom of every page. */
export const AUTHOR = { name: 'maarkn', url: 'https://maarkn.dev' } as const
/** GitHub logins shown in the footer's contributors line, in order. */
export const CONTRIBUTORS = ['maarkN', 'hannadev-uiux'] as const
/** Brand image for link previews (`docs/brand/og.png`), bundled into the Worker and served here. */
export const OG_IMAGE_PATH = '/og.png'
export const OG_IMAGE_URL = `${SITE_URL}${OG_IMAGE_PATH}`

/** The mark ("the Tether"), regular weight: the same paths as `docs/design/identity/shared.js`. */
export const MARK_REGULAR =
  '<g fill="none" stroke="currentColor" stroke-width="24" stroke-linecap="round" stroke-linejoin="round">' +
  '<circle cx="128" cy="184" r="34"/><path d="M128 150V66"/><path d="M111 154C104 120 88 100 60 80"/>' +
  '<path d="M145 154C152 120 168 100 196 80"/></g>' +
  '<rect x="110" y="34" width="36" height="36" rx="9" fill="currentColor"/>' +
  '<rect x="36" y="52" width="36" height="36" rx="9" fill="currentColor"/>' +
  '<rect x="184" y="52" width="36" height="36" rx="9" fill="currentColor"/>'

/** Bold weight, for anything under 24 px (the favicon). */
export const MARK_BOLD =
  '<g fill="none" stroke="currentColor" stroke-width="34" stroke-linecap="round" stroke-linejoin="round">' +
  '<circle cx="128" cy="186" r="36"/><path d="M128 150V70"/><path d="M108 156C100 122 86 104 56 84"/>' +
  '<path d="M148 156C156 122 170 104 200 84"/></g>' +
  '<rect x="104" y="24" width="48" height="48" rx="12" fill="currentColor"/>' +
  '<rect x="28" y="46" width="48" height="48" rx="12" fill="currentColor"/>' +
  '<rect x="180" y="46" width="48" height="48" rx="12" fill="currentColor"/>'

/** Amber mark on the dark canvas, rounded like an app icon. */
export function faviconSvg(): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" color="#e8a33d">' +
    '<rect width="256" height="256" rx="56" fill="#0d0d0d"/>' +
    `<g transform="translate(32 32) scale(0.75)">${MARK_BOLD}</g></svg>`
  )
}

export function sitemapXml(): string {
  const docs = WEB_LOCALES.flatMap((locale) => DOC_SLUGS.map((slug) => docPath(locale, slug)))
  const paths = ['/', ...Object.values(LOCALE_PATHS), ...docs]
  const urls = paths.map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

export function robotsTxt(): string {
  return `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /ios/\nDisallow: /app/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
}
