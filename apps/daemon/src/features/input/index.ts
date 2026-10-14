import type { KeyedMutex } from '../../core/keyed-mutex.ts'
import type { DaemonContext } from '../../main.ts'
import type { SessionStore } from '../sessions/store.ts'
import { InputService } from './service.ts'

export function registerInputFeature(ctx: DaemonContext, store: SessionStore, lock: KeyedMutex) {
  const service = new InputService(ctx.tmux, store, lock, {
    strategy: ctx.config.inputStrategy,
    pasteEnterDelayMs: ctx.config.pasteEnterDelayMs,
  })
  ctx.router.register('session.input', async (msg) => {
    await service.sendText(msg.sessionId, msg.text)
    return undefined
  })
  ctx.router.register('session.key', async (msg) => {
    await service.sendKey(msg.sessionId, msg.key)
    return undefined
  })
  return { service }
}
