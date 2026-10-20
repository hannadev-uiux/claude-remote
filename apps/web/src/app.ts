import ogImage from '../../../docs/brand/og.png?inline'
import installPs1 from '../../../install.ps1?raw'
import installSh from '../../../install.sh?raw'
import { APP_FILES, BUILDS, classifyDevice, LEGACY_PAGE, parseBuilds, renderAppLinkPage } from './app-link.ts'
import { isDocSlug, negotiatedDocPath } from './docs/content.ts'
import { renderDoc } from './docs/page.ts'
import { pickLocale } from './i18n/locale.ts'
import {
  classifyInstallClient,
  type InstallScriptName,
  installOs,
  installScript,
  scriptFor,
} from './install.ts'
import { renderInstallPage } from './install-page.ts'
import { renderLanding, renderNotFound } from './landing.ts'
import { route } from './routes.ts'
import { faviconSvg, robotsTxt, sitemapXml } from './site.ts'
import type { PublishTokens } from './updates/auth.ts'
import { handleUpdates } from './updates/handler.ts'
import type { UpdatesStore } from './updates/store.ts'

/** A stored install-link file; the body is opened only when it is sent. */
export type StoredFile = {
  size: number
  etag: string
  stream(): ReadableStream<Uint8Array>
  text(): Promise<string>
}

/** Where install-link folders live (`<token>/<file>`, validated by the router). */
export interface BuildsStore {
  get(key: string): Promise<StoredFile | null>
}

/** What the site needs from its host: the two stores and the publish tokens. */
export type AppDeps = { updates: UpdatesStore; builds: BuildsStore; tokens: PublishTokens }

/** A build file of an install link, with the content type of its name. */
async function appFile(request: Request, builds: BuildsStore, key: string, name: string): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405 })
  const stored = await builds.get(key)
  if (!stored) return new Response('Not found', { status: 404 })
  const headers = new Headers({
    'cache-control': 'no-cache',
    'x-robots-tag': 'noindex',
    'content-type': APP_FILES[name] ?? 'application/octet-stream',
    etag: stored.etag,
    'content-length': String(stored.size),
  })
  return new Response(request.method === 'HEAD' ? null : stored.stream(), { headers })
}

/**
 * The install page of a token folder: rendered from `builds.json` for the device that asks, or the
 * `index.html` an older publisher uploaded. Private (the token is the only protection): never
 * cached, indexed or sent on as a referrer.
 */
async function appPage(request: Request, builds: BuildsStore, url: URL, token: string): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405 })
  const headers = new Headers({
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-cache',
    'x-robots-tag': 'noindex',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
  })
  const stored = await builds.get(`${token}/${BUILDS}`)
  let body: string
  if (stored) {
    let json: unknown = null
    try {
      json = JSON.parse(await stored.text())
    } catch {
      // A broken builds.json shows both platforms as not published rather than an error.
    }
    const locale = pickLocale(request.headers.get('accept-language'))
    body = renderAppLinkPage({
      locale,
      device: url.searchParams.has('all') ? 'all' : classifyDevice(request.headers.get('user-agent')),
      builds: parseBuilds(json),
      pageUrl: `${url.origin}${url.pathname.replace(/index\.html$/, '')}`,
    })
    headers.set('content-language', locale)
    headers.set('vary', 'Accept-Language, User-Agent')
  } else {
    const legacy = await builds.get(`${token}/${LEGACY_PAGE}`)
    if (!legacy) return new Response('Not found', { status: 404 })
    body = await legacy.text()
  }
  return new Response(request.method === 'HEAD' ? null : body, { headers })
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

const SCRIPTS: Record<InstallScriptName, string> = { 'install.sh': installSh, 'install.ps1': installPs1 }

/**
 * An installer as plain text (`irm` hands a string to `iex`; curl does not care), never cached so a
 * deploy is seen at once. `vary` is set when the body depended on who asked (`/install`).
 */
function script(request: Request, name: InstallScriptName, ref: string | null, varies: boolean): Response {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405 })
  const headers = new Headers({
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-cache',
    'x-content-type-options': 'nosniff',
  })
  if (varies) headers.set('vary', 'User-Agent, Accept')
  const body = installScript(name, SCRIPTS[name], ref)
  return new Response(request.method === 'HEAD' ? null : body, { headers })
}

/** The link preview image, decoded once from the `data:` URL Vite inlined. */
const OG_IMAGE = Uint8Array.from(atob(ogImage.slice(ogImage.indexOf(',') + 1)), (char) => char.charCodeAt(0))

function file(body: string | Uint8Array, type: string): Response {
  return new Response(body, { headers: { 'content-type': type, 'cache-control': 'public, max-age=86400' } })
}

/** The whole site as one request handler; the host (server.ts, tests) supplies storage and tokens. */
export function createApp({ updates, builds, tokens }: AppDeps): (request: Request) => Promise<Response> {
  return async (request) => {
    const url = new URL(request.url)
    const target = route(url.pathname, url.search)
    if (target.kind === 'updates') return handleUpdates(request, target.path, updates, tokens)
    if (target.kind === 'app-file') return appFile(request, builds, target.key, target.name)
    if (target.kind === 'app-page') return appPage(request, builds, url, target.token)
    if (target.kind === 'bad-ref') {
      // Plain text: piped into bash it is a harmless "command not found", never a script.
      return new Response('invalid ref\n', {
        status: 400,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      })
    }
    if (target.kind === 'script') return script(request, target.name, target.ref, false)
    if (target.kind === 'install') {
      const client = classifyInstallClient(request.headers.get('user-agent'), request.headers.get('accept'))
      if (client !== 'browser') return script(request, scriptFor(client), target.ref, true)
    }
    if (target.kind === 'sitemap') return file(sitemapXml(), 'application/xml; charset=utf-8')
    if (target.kind === 'robots') return file(robotsTxt(), 'text/plain; charset=utf-8')
    if (target.kind === 'favicon') return file(faviconSvg(), 'image/svg+xml')
    if (target.kind === 'og-image') return file(OG_IMAGE, 'image/png')
    const negotiated = pickLocale(request.headers.get('accept-language'))
    const notFound = () => page(renderNotFound(negotiated), 404, negotiated, true)
    if (target.kind === 'install') {
      const html = renderInstallPage(negotiated, installOs(request.headers.get('user-agent')), target.ref)
      const response = page(html, 200, negotiated, true)
      response.headers.set('vary', 'Accept-Language, User-Agent, Accept')
      response.headers.set('cache-control', 'private, max-age=600')
      return response
    }
    if (target.kind === 'page') {
      const locale = target.locale ?? negotiated
      return page(renderLanding(locale, target.locale ? undefined : '/'), 200, locale, target.locale === null)
    }
    if (target.kind === 'doc') {
      if (!isDocSlug(target.slug)) return notFound()
      const locale = target.locale ?? negotiated
      const html = renderDoc(
        locale,
        target.slug,
        target.locale ? {} : { path: negotiatedDocPath(target.slug) },
      )
      return html ? page(html, 200, locale, target.locale === null) : notFound()
    }
    return notFound()
  }
}
