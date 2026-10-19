import { PermissionModeSchema } from '@remote-harness/protocol'
import { DaemonError } from '../../core/errors.ts'
import type { DaemonContext } from '../../main.ts'
import type { SessionStore } from '../sessions/store.ts'
import { oneLine } from '../sessions/transcript-meta.ts'
import { type EntryListener, type StreamTarget, TranscriptService } from './service.ts'

/** Resolves the transcript file for a session or one of its subagents. */
export type TranscriptPathResolver = (sessionId: string, agentId?: string) => string | null

export function registerTranscriptFeature(
  ctx: DaemonContext,
  store: SessionStore,
  /** Called when new transcript lines were read for a session (last activity). */
  onActivity: (sessionId: string, at: number) => void = () => {},
) {
  const service = new TranscriptService(
    ctx.logger,
    (sessionId, update) => {
      const mode = PermissionModeSchema.safeParse(update.permissionMode)
      store.upsert(sessionId, {
        ...(mode.success ? { permissionMode: mode.data } : {}),
        ...(update.customTitle ? { title: oneLine(update.customTitle) } : {}),
      })
    },
    onActivity,
  )

  const resolvers: TranscriptPathResolver[] = [
    (sessionId, agentId) => (agentId ? null : (store.get(sessionId)?.transcriptPath ?? null)),
  ]

  function target(sessionId: string, agentId?: string): StreamTarget {
    for (const resolve of resolvers) {
      const path = resolve(sessionId, agentId)
      if (path) return { sessionId, agentId, path }
    }
    throw new DaemonError(
      'not_found',
      agentId ? `subagent ${agentId} not found` : `session ${sessionId} not found`,
    )
  }

  ctx.router.register('session.subscribe', async (msg, connection) => ({
    type: 'transcript.page',
    ...(await service.subscribe(target(msg.sessionId, msg.agentId), connection, msg.sinceCursor)),
  }))
  ctx.router.register('session.unsubscribe', (msg, connection) => {
    service.unsubscribe(msg.sessionId, connection, msg.agentId)
    return undefined
  })
  ctx.router.register('session.history', async (msg) => ({
    type: 'transcript.page',
    ...(await service.history(target(msg.sessionId, msg.agentId), msg.before, msg.limit)),
  }))

  ctx.router.register('transcript.image', async (msg) => ({
    type: 'transcript.image',
    ...(await service.image(target(msg.sessionId, msg.agentId), msg.imageId)),
  }))

  ctx.onStop(() => service.dispose())

  return {
    service,
    /** Follows a session's own transcript (not its subagents') for daemon-side listeners. */
    follow: (sessionId: string, listener: EntryListener) => service.follow(target(sessionId), listener),
    /** Lets other features (subagents) teach the stream how to find more transcripts. */
    addResolver(resolver: TranscriptPathResolver) {
      resolvers.push(resolver)
    },
  }
}
