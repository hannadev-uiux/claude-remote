import { env } from 'cloudflare:workers'
import { route } from './routes.ts'

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

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const target = route(url.pathname, url.search)
    if (target.kind === 'updates') {
      // Same method, headers and body; redirects and errors go back to the client unchanged.
      return fetch(new Request(target.url, request), { redirect: 'manual' })
    }
    if (target.kind === 'ios') return iosFile(request, target.key)
    return new Response('Not found', { status: 404 })
  },
} satisfies ExportedHandler
