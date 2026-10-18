import type { DaemonContext } from '../../main.ts'
import { headerValue, PROFILE_HEADER } from '../hooks/receiver.ts'
import type { SessionStore } from '../sessions/store.ts'
import { StatusLineService } from './service.ts'
import { STATUS_LINE_ROUTE } from './wrapper.ts'

export function registerStatusLineFeature(ctx: DaemonContext, store: SessionStore) {
  const service = new StatusLineService(store, ctx.hub, ctx.profiles, ctx.logger)
  ctx.hooks.post(STATUS_LINE_ROUTE, async (request, reply) => {
    const ok = service.handle(request.body, headerValue(request.headers[PROFILE_HEADER]))
    return reply.code(ok ? 204 : 400).send()
  })
  ctx.onClientConnected((connection) => {
    for (const limits of service.current()) connection.send({ type: 'limits.updated', limits })
  })
  return { service }
}
