import type { DaemonContext } from '../../main.ts'
import type { SessionStore } from '../sessions/store.ts'
import type { TranscriptPathResolver } from '../transcript/index.ts'
import { SubagentTracker } from './tracker.ts'

export function registerSubagentsFeature(
  ctx: DaemonContext,
  store: SessionStore,
  addTranscriptResolver: (resolver: TranscriptPathResolver) => void,
) {
  const tracker = new SubagentTracker(store, ctx.hub, ctx.logger)
  store.onChange((session) => tracker.sync(session))
  ctx.bus.on('hook', (hook) => tracker.handleHook(hook))
  addTranscriptResolver((sessionId, agentId) => (agentId ? tracker.transcriptPath(sessionId, agentId) : null))
  ctx.onStop(() => tracker.dispose())
  return { tracker }
}
