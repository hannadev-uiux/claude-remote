import { paths } from '../../core/paths.ts'
import type { DaemonContext } from '../../main.ts'
import { requireControllable } from '../input/service.ts'
import type { SessionStore } from '../sessions/store.ts'
import { AttachmentStore } from './store.ts'

const PRUNE_INTERVAL_MS = 60 * 60 * 1000

export function registerAttachmentsFeature(ctx: DaemonContext, sessions: SessionStore) {
  const store = new AttachmentStore(paths.attachments(), ctx.logger)
  const prune = () => {
    store.prune().catch((error: unknown) => ctx.logger.warn({ err: error }, 'attachment prune failed'))
  }
  prune()
  const timer = setInterval(prune, PRUNE_INTERVAL_MS)
  timer.unref()
  ctx.onStop(() => clearInterval(timer))

  ctx.router.register('attachment.upload', async (msg) => {
    requireControllable(sessions, msg.sessionId)
    const attachmentId = await store.save(msg.sessionId, msg.mimeType, msg.data)
    return { type: 'attachment.uploaded', attachmentId }
  })
  return { store }
}
