import type { DaemonContext } from '../../main.ts'
import { requireControllable } from '../input/service.ts'
import type { SessionStore } from '../sessions/store.ts'
import { PaneStreamer } from './streamer.ts'

export function registerPaneFeature(ctx: DaemonContext, store: SessionStore) {
  const streamer = new PaneStreamer(ctx.tmux, ctx.logger)
  ctx.router.register('pane.subscribe', (msg, connection) => {
    const { paneId } = requireControllable(store, msg.sessionId)
    streamer.subscribe(msg.sessionId, paneId, connection)
    return undefined
  })
  ctx.router.register('pane.unsubscribe', (msg, connection) => {
    streamer.unsubscribe(msg.sessionId, connection)
    return undefined
  })
  // "Focus in tmux": the window and pane come to the front of the tmux client on the computer.
  ctx.router.register('pane.focus', async (msg) => {
    const { paneId } = requireControllable(store, msg.sessionId)
    await ctx.tmux.focusPane(paneId)
    return undefined
  })
  ctx.onStop(() => streamer.dispose())
  return { streamer }
}
