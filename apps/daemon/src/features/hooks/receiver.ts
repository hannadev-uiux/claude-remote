import type { Profile } from '@remote-harness/protocol'
import type { FastifyInstance } from 'fastify'
import type { EventBus } from '../../core/event-bus.ts'
import type { DaemonEvents } from '../../core/events.ts'
import type { Logger } from '../../core/logger.ts'
import { type HookEvent, type HookEventName, HookPayloadSchema, isHookEventName } from './payloads.ts'

export const PANE_HEADER = 'x-claude-remote-pane'
export const PROFILE_HEADER = 'x-claude-remote-profile'

/** Answers hooks that expect a decision (PermissionRequest). Aborted if Claude Code drops the request. */
export type HookResponder = (hook: HookEvent, signal: AbortSignal) => Promise<Record<string, unknown>>

export function headerValue(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value
  if (!v) return null
  const trimmed = v.trim()
  // Unset env vars may arrive empty or as the literal placeholder.
  return trimmed && !trimmed.startsWith('$') ? trimmed : null
}

export function resolveProfileId(
  header: string | null,
  transcriptPath: string | undefined,
  profiles: readonly Profile[],
): string | null {
  if (header && profiles.some((p) => p.id === header)) return header
  if (transcriptPath) {
    const match = profiles
      .filter((p) => transcriptPath.startsWith(`${p.configDir}/`))
      .sort((a, b) => b.configDir.length - a.configDir.length)[0]
    if (match) return match.id
  }
  return header
}

export class HookReceiver {
  private readonly responders = new Map<HookEventName, HookResponder>()

  constructor(
    private readonly bus: EventBus<DaemonEvents>,
    private readonly profiles: readonly Profile[],
    private readonly logger: Logger,
  ) {}

  setResponder(event: HookEventName, responder: HookResponder): void {
    this.responders.set(event, responder)
  }

  register(app: FastifyInstance): void {
    app.post<{ Params: { event: string } }>('/hooks/:event', async (request, reply) => {
      const { event } = request.params
      if (!isHookEventName(event)) return reply.code(404).send({ error: 'unknown hook event' })
      const parsed = HookPayloadSchema.safeParse(request.body)
      if (!parsed.success) {
        this.logger.warn({ event, issues: parsed.error.issues }, 'invalid hook payload')
        return reply.code(400).send({ error: 'invalid payload' })
      }
      const hook: HookEvent = {
        event,
        payload: parsed.data,
        paneId: headerValue(request.headers[PANE_HEADER]),
        profileId: resolveProfileId(
          headerValue(request.headers[PROFILE_HEADER]),
          parsed.data.transcript_path,
          this.profiles,
        ),
        receivedAt: new Date().toISOString(),
      }
      this.logger.debug({ event, session: hook.payload.session_id, pane: hook.paneId }, 'hook received')
      this.bus.emit('hook', hook)

      const responder = this.responders.get(event)
      if (!responder) return reply.send({})
      const controller = new AbortController()
      reply.raw.on('close', () => {
        if (!reply.raw.writableFinished) controller.abort()
      })
      return reply.send(await responder(hook, controller.signal))
    })
  }
}
