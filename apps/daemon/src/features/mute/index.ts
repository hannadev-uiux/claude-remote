import { paths } from '../../core/paths.ts'
import type { DaemonContext } from '../../main.ts'
import { MuteStore } from './store.ts'

export async function registerMuteFeature(ctx: DaemonContext) {
  const store = new MuteStore(paths.mute())
  await store.load()
  ctx.router.register('settings.mute', async (msg) => {
    const muted = await store.set(msg.target, msg.targetId, msg.muted)
    ctx.hub.broadcast({ type: 'mute.updated', muted })
    return undefined
  })
  return { store }
}
