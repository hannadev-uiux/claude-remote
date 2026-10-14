import { paths } from '../../core/paths.ts'
import type { TmuxClient } from '../../infra/tmux.ts'
import type { DaemonContext } from '../../main.ts'
import { SessionService } from './service.ts'
import { SessionStore } from './store.ts'
import { toWire } from './types.ts'

export const PANE_POLL_MS = 5_000

export function registerSessionsFeature(ctx: DaemonContext, tmux: TmuxClient) {
  const store = new SessionStore(ctx.hub, paths.state(), ctx.logger)
  const service = new SessionService(store, tmux, ctx.profiles, ctx.logger, {
    recentDays: ctx.config.recentDays,
  })

  ctx.bus.on('hook', (hook) => {
    service
      .handleHook(hook)
      .catch((error) => ctx.logger.error({ err: error }, 'session hook handling failed'))
  })

  ctx.bus.on('permission.resolved', ({ info, outcome }) => {
    if (outcome === 'allowed' || outcome === 'denied') store.upsert(info.sessionId, { state: 'running' })
  })

  ctx.router.register('sessions.list', async () => {
    await service.scanRecent().catch((error) => ctx.logger.warn({ err: error }, 'recent scan failed'))
    return { type: 'sessions.snapshot', sessions: store.all().map(toWire) }
  })

  const timer = setInterval(() => void service.reconcilePanes(), PANE_POLL_MS)
  ctx.onStop(() => {
    clearInterval(timer)
    store.dispose()
    return store.save()
  })

  return {
    store,
    service,
    async start() {
      await service.restore().catch((error) => ctx.logger.warn({ err: error }, 'restore failed'))
      await service.scanRecent(true).catch((error) => ctx.logger.warn({ err: error }, 'recent scan failed'))
    },
  }
}
