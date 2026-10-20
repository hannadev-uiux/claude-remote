import { createDesktop } from '../../infra/desktop.ts'
import { currentWsl, resolvePlatform } from '../../infra/platform.ts'
import type { DaemonContext } from '../../main.ts'
import { requireControllable } from '../input/service.ts'
import type { SessionStore } from '../sessions/store.ts'
import { showInTerminal } from './show-in-terminal.ts'
import { PaneStreamer } from './streamer.ts'

export function registerPaneFeature(ctx: DaemonContext, store: SessionStore) {
  const streamer = new PaneStreamer(ctx.tmux, ctx.logger)
  const platform = resolvePlatform()
  const wsl = currentWsl(platform) !== null
  const desktop = createDesktop(ctx.exec, platform, { wsl })
  ctx.router.register('pane.subscribe', (msg, connection) => {
    const { paneId } = requireControllable(store, msg.sessionId)
    streamer.subscribe(msg.sessionId, paneId, connection)
    return undefined
  })
  ctx.router.register('pane.unsubscribe', (msg, connection) => {
    streamer.unsubscribe(msg.sessionId, connection)
    return undefined
  })
  // "Open in terminal (tmux)": the session's pane shows in a terminal on the computer's screen.
  ctx.router.register('pane.focus', async (msg) => {
    const { paneId } = requireControllable(store, msg.sessionId)
    await showInTerminal(ctx.tmux, desktop, platform, wsl, paneId)
    return undefined
  })
  ctx.onStop(() => streamer.dispose())
  return { streamer }
}
