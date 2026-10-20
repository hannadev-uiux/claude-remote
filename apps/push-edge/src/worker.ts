/**
 * push.remoteharness.app → the push relay Cloud Function. A stable hostname for app builds, so the
 * backend can move without a new build. Only POST /grant and /send exist.
 */
const ORIGIN = 'https://pushrelay-35zxymmbya-rj.a.run.app'

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return Response.json({ error: 'method_not_allowed' }, { status: 405 })
    }
    const { pathname, search } = new URL(request.url)
    return fetch(new Request(`${ORIGIN}${pathname}${search}`, request))
  },
}
