/**
 * The site on Node: a plain `node:http` server around `createApp`. Node already speaks `Request`,
 * `Response` and web streams, so this only converts the two ends.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { type AppDeps, createApp } from './app.ts'

/** The URL the visitor asked for: Traefik sets `X-Forwarded-Proto`, and `Host` is the public name. */
export function requestUrl(headers: IncomingMessage['headers'], path: string | undefined): string {
  const forwarded = headers['x-forwarded-proto']
  const proto = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim()
  return `${proto === 'https' ? 'https' : 'http'}://${headers.host ?? 'localhost'}${path ?? '/'}`
}

function toRequest(req: IncomingMessage): Request {
  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) for (const item of value) headers.append(name, item)
    else if (value !== undefined) headers.set(name, value)
  }
  const method = req.method ?? 'GET'
  const body =
    method === 'GET' || method === 'HEAD' ? null : (Readable.toWeb(req) as ReadableStream<Uint8Array>)
  const init: RequestInit & { duplex: 'half' } = { method, headers, body, duplex: 'half' }
  return new Request(requestUrl(req.headers, req.url), init)
}

async function send(res: ServerResponse, response: Response, method: string | undefined): Promise<void> {
  res.statusCode = response.status
  response.headers.forEach((value, name) => {
    res.setHeader(name, value)
  })
  if (!response.body || method === 'HEAD') {
    await response.body?.cancel()
    res.end()
    return
  }
  await pipeline(Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]), res)
}

/** An HTTP server for the site; `listen` is the caller's. */
export function createSiteServer(deps: AppDeps, log: (error: unknown) => void = console.error): Server {
  const app = createApp(deps)
  return createServer(async (req, res) => {
    try {
      await send(res, await app(toRequest(req)), req.method)
    } catch (error) {
      log(error)
      if (!res.headersSent) {
        res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('Internal error\n')
      } else {
        res.destroy()
      }
    }
  })
}

/** Stops taking connections and resolves once the open requests are answered. */
export function closeServer(server: Server): Promise<void> {
  return new Promise((resolveClose, reject) => {
    server.close((error) => (error ? reject(error) : resolveClose()))
    // Idle keep-alive connections would otherwise hold `close` open until they time out.
    server.closeIdleConnections()
  })
}
