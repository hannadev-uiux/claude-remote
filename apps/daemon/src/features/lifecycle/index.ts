import { paths } from '../../core/paths.ts'
import type { DaemonContext } from '../../main.ts'
import type { CheckoutResolver } from '../checkout/resolver.ts'
import type { SessionService } from '../sessions/service.ts'
import type { SessionStore } from '../sessions/store.ts'
import { LifecycleService } from './service.ts'

export function registerLifecycleFeature(
  ctx: DaemonContext,
  store: SessionStore,
  sessions: SessionService,
  checkouts: CheckoutResolver,
) {
  const service = new LifecycleService(
    ctx.exec,
    store,
    ctx.profiles,
    paths.bin(),
    undefined,
    (pane) => ctx.tmux.hasPane(pane),
    (dir) => checkouts.resolve(dir, { fresh: true }),
  )
  ctx.router.register('session.start', async (msg) => ({
    type: 'ack',
    data: await service.start(msg.profileId, msg.cwd, { worktree: msg.worktree }),
  }))
  ctx.router.register('session.resume', async (msg) => ({
    type: 'ack',
    data: await service.resume(msg.profileId, msg.sessionId),
  }))
  ctx.router.register('projects.list', async (msg) => {
    await sessions.scanRecent().catch(() => undefined)
    return { type: 'projects.results', items: service.projects(msg.profileId) }
  })
  return { service }
}
