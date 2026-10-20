import { DaemonError } from '../../core/errors.ts'
import type { KeyedMutex } from '../../core/keyed-mutex.ts'
import { paths } from '../../core/paths.ts'
import { GitClient } from '../../infra/git.ts'
import type { DaemonContext } from '../../main.ts'
import type { CheckoutResolver } from '../checkout/resolver.ts'
import type { SessionService } from '../sessions/service.ts'
import type { SessionStore } from '../sessions/store.ts'
import { CloseService } from './close.ts'
import { listDirectories } from './directories.ts'
import { LifecycleService, START_SETTLE_MS } from './service.ts'

export function registerLifecycleFeature(
  ctx: DaemonContext,
  store: SessionStore,
  sessions: SessionService,
  checkouts: CheckoutResolver,
  closing: {
    /** Serializes pane interactions per session (shared with the input feature). */
    lock: Pick<KeyedMutex, 'run'>
    /** Denies the session's pending permission requests before it is closed. */
    denyPending: (sessionId: string) => void
  },
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
  const closer = new CloseService({
    store,
    tmux: ctx.tmux,
    git: new GitClient(ctx.exec, {
      onPurgeError: (path, error) =>
        ctx.logger.warn(
          { path, reason: error instanceof Error ? error.message : String(error) },
          'worktree purge failed',
        ),
    }),
    lock: closing.lock,
    denyPending: closing.denyPending,
    log: ctx.logger,
  })

  ctx.router.register('session.start', async (msg) => {
    const worktree = msg.worktree ?? false
    try {
      const data = await service.start(msg.profileId, msg.cwd, {
        worktree,
        ...(msg.model ? { model: msg.model } : {}),
      })
      ctx.logger.info(
        { profileId: msg.profileId, paneId: data.paneId, worktree, model: msg.model ?? null },
        'session started',
      )
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
  ctx.router.register('session.close', async (msg) => {
    const data = await closer.close(msg.sessionId, msg.worktree)
    ctx.logger.info({ sessionId: msg.sessionId, ...data }, 'session closed')
    return { type: 'ack', data }
  })
  ctx.router.register('worktree.inspect', async (msg) => ({
    type: 'worktree.info',
    worktree: await closer.inspect(msg.sessionId),
  }))
  ctx.router.register('worktree.cleanup', async (msg) => {
    await closer.cleanup(msg.sessionId, msg.action)
    ctx.logger.info({ sessionId: msg.sessionId, action: msg.action }, 'worktree cleaned up')
    return { type: 'ack' }
  })
  ctx.router.register('directories.list', async (msg) => ({
    type: 'directories.results',
    ...(await listDirectories(msg.path, { prefix: msg.prefix, hidden: msg.hidden, limit: msg.limit })),
  }))
  ctx.router.register('projects.list', async (msg) => {
    await sessions.scanRecent().catch(() => undefined)
    return { type: 'projects.results', items: service.projects(msg.profileId) }
  })
  return { service, closer }
}
