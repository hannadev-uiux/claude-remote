import type { Desktop } from '../../infra/desktop.ts'
import type { Platform } from '../../infra/platform.ts'
import type { TmuxClient } from '../../infra/tmux.ts'
import { planShowInTerminal } from './terminal-focus.ts'

/**
 * "Open in terminal (tmux)": switches any already-attached client to this pane and raises its
 * terminal app, or opens a new terminal window attached to it when none is attached.
 */
export async function showInTerminal(
  tmux: TmuxClient,
  desktop: Desktop,
  platform: Platform,
  wsl: boolean,
  paneId: string,
): Promise<void> {
  const clients = await tmux.listClients(paneId)
  for (const client of clients) await tmux.switchClient(client.tty, paneId)
  await tmux.focusPane(paneId)
  const runningProcessNames = platform === 'darwin' ? await desktop.listRunningApps() : []
  const steps = planShowInTerminal({
    platform,
    wsl,
    hasAttachedClient: clients.length > 0,
    runningProcessNames,
    terminalEnv: process.env.TERMINAL ?? null,
    paneId,
  })
  await desktop.runSteps(steps)
}
