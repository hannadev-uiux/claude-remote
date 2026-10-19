import { paths } from '../../core/paths.ts'
import type { DaemonContext } from '../../main.ts'
import type { InputService } from '../input/service.ts'
import type { SessionStore } from '../sessions/store.ts'
import { QueueService } from './service.ts'

/** Owns prompt delivery: `session.input` with its modes and the queue messages. */
export function registerQueueFeature(
  ctx: DaemonContext,
  store: SessionStore,
  input: Pick<InputService, 'sendText'>,
  hasPending: (sessionId: string) => boolean,
) {
  const service = new QueueService({
    store,
    input,
    hasPending,
    broadcaster: ctx.hub,
    statePath: paths.queue(),
    logger: ctx.logger,
  })
  store.onChange((session) => service.onSessionChange(session))
  ctx.router.register('session.input', async (msg) => ({
    type: 'ack',
    data: await service.submit(msg.sessionId, msg.text, msg.attachmentIds ?? [], msg.mode),
  }))
  ctx.router.register('queue.update', async (msg) => {
    await service.update(msg.sessionId, msg.itemId, msg.text)
    return undefined
  })
  ctx.router.register('queue.remove', async (msg) => {
    await service.remove(msg.sessionId, msg.itemId)
    return undefined
  })
  ctx.router.register('queue.sendNow', async (msg) => {
    await service.sendNow(msg.sessionId, msg.itemId)
    return undefined
  })
  ctx.router.register('queue.flush', async (msg) => {
    await service.flush(msg.sessionId)
    return undefined
  })
  ctx.onClientConnected((connection) => service.replay(connection))
  ctx.onStop(() => service.dispose())
  return { service }
}
