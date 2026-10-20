import type { Profile } from '@remote-harness/protocol'
import { DaemonError } from '../../core/errors.ts'
import type { DaemonContext } from '../../main.ts'
import type { SessionStore } from '../sessions/store.ts'
import { VoicePolishService } from './service.ts'

/** `voice.polish`: rewrites a dictated transcript through the session's agent CLI. */
export function registerVoicePolishFeature(ctx: DaemonContext, store: SessionStore) {
  const service = new VoicePolishService({ exec: ctx.exec, logger: ctx.logger })

  function profileOf(sessionId: string): Profile {
    const session = store.get(sessionId)
    if (!session) throw new DaemonError('not_found', `session ${sessionId} not found`)
    const profile = ctx.profiles.find((p) => p.id === session.profileId)
    if (!profile) throw new DaemonError('not_found', `profile ${session.profileId} not found`)
    return profile
  }

  ctx.router.register('voice.polish', async (msg) => {
    const result = await service.polish(profileOf(msg.sessionId), msg.text)
    return { type: 'voice.polish.result', ...result }
  })

  return { service }
}
