import { env } from 'cloudflare:workers'
import { pickLocale } from './i18n/locale.ts'
import { renderLanding, renderNotFound } from './landing.ts'
import { route } from './routes.ts'
import { faviconSvg, robotsTxt, sitemapXml } from './site.ts'

async function iosFile(request: Request, key: string): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405 })
  const object = await env.IOS_BUILDS.get(key)
  if (!object) return new Response('Not found', { status: 404 })
  const headers = new Headers({ 'cache-control': 'no-cache', 'x-robots-tag': 'noindex' })
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('content-length', String(object.size))
  return new Response(request.method === 'HEAD' ? null : object.body, { headers })
}

/** An HTML page; `negotiated` marks the ones whose language came from the request headers. */
function page(body: string, status: number, locale: string, negotiated: boolean): Response {
  const headers = new Headers({
    'content-type': 'text/html; charset=utf-8',
    'content-language': locale,
    'cache-control': 'public, max-age=600',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
  })
  if (negotiated) headers.set('vary', 'Accept-Language')
  return new Response(body, { status, headers })
}

function file(body: string, type: string): Response {
  return new Response(body, { headers: { 'content-type': type, 'cache-control': 'public, max-age=86400' } })
}

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const target = route(url.pathname, url.search)
    if (target.kind === 'updates') {
      // Same method, headers and body; redirects and errors go back to the client unchanged.
      return fetch(new Request(target.url, request), { redirect: 'manual' })
    }
    if (target.kind === 'ios') return iosFile(request, target.key)
    if (target.kind === 'installer') return Response.redirect(target.url, 302)
    if (target.kind === 'sitemap') return file(sitemapXml(), 'application/xml; charset=utf-8')
    if (target.kind === 'robots') return file(robotsTxt(), 'text/plain; charset=utf-8')
    if (target.kind === 'favicon') return file(faviconSvg(), 'image/svg+xml')
    const negotiated = pickLocale(request.headers.get('accept-language'))
    if (target.kind === 'page') {
      const locale = target.locale ?? negotiated
      return page(renderLanding(locale, target.locale ? undefined : '/'), 200, locale, target.locale === null)
    }
    return page(renderNotFound(negotiated), 404, negotiated, true)
  },
} satisfies ExportedHandler
