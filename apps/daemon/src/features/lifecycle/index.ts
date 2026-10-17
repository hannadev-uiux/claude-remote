import { DaemonError } from '../../core/errors.ts'
import { paths } from '../../core/paths.ts'
import type { DaemonContext } from '../../main.ts'
import type { CheckoutResolver } from '../checkout/resolver.ts'
import type { SessionService } from '../sessions/service.ts'
import type { SessionStore } from '../sessions/store.ts'
import { listDirectories } from './directories.ts'
import { LifecycleService, START_SETTLE_MS } from './service.ts'

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
    undefined,
    START_SETTLE_MS,
  )
  ctx.router.register('session.start', async (msg) => {
    const worktree = msg.worktree ?? false
    try {
      const data = await service.start(msg.profileId, msg.cwd, { worktree })
      ctx.logger.info({ profileId: msg.profileId, paneId: data.paneId, worktree }, 'session started')
      return { type: 'ack', data }
    } catch (error) {
      const code = error instanceof DaemonError ? error.code : 'internal'
      const reason = error instanceof Error ? error.message : String(error)
      ctx.logger.warn({ profileId: msg.profileId, worktree, code, reason }, 'session.start rejected')
      throw error
    }
  })
  ctx.router.register('session.resume', async (msg) => ({
    type: 'ack',
    data: await service.resume(msg.profileId, msg.sessionId),
  }))
  ctx.router.register('directories.list', async (msg) => ({
    type: 'directories.results',
    ...(await listDirectories(msg.path, { prefix: msg.prefix, hidden: msg.hidden, limit: msg.limit })),
  }))
  ctx.router.register('projects.list', async (msg) => {
    await sessions.scanRecent().catch(() => undefined)
    return { type: 'projects.results', items: service.projects(msg.profileId) }
  })
  return { service }
}
