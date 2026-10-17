import type { KeyedMutex } from '../../core/keyed-mutex.ts'
import type { DaemonContext } from '../../main.ts'
import type { AttachmentStore } from '../attachments/store.ts'
import type { SessionStore } from '../sessions/store.ts'
import { InputService } from './service.ts'

export function registerInputFeature(
  ctx: DaemonContext,
  store: SessionStore,
  lock: KeyedMutex,
  attachments: AttachmentStore,
) {
  const service = new InputService(
    ctx.tmux,
    store,
    lock,
    {
      strategy: ctx.config.inputStrategy,
      pasteEnterDelayMs: ctx.config.pasteEnterDelayMs,
    },
    attachments,
  )
  ctx.router.register('session.input', async (msg) => {
    await service.sendText(msg.sessionId, msg.text, msg.attachmentIds)
    return undefined
  })
  ctx.router.register('session.key', async (msg) => {
    await service.sendKey(msg.sessionId, msg.key)
    return undefined
  })
  return { service }
}
