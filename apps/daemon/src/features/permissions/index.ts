import { effectiveLocale } from '../../core/config.ts'
import { messagesFor } from '../../core/i18n/index.ts'
import { paths } from '../../core/paths.ts'
import type { DaemonContext } from '../../main.ts'
import type { EntryListener } from '../transcript/service.ts'
import { PermissionBroker } from './broker.ts'
import { entryMovesOn, hookMovesOn } from './handover.ts'
import { RulesLog } from './rules-log.ts'

/** Follows a session's transcript (see `registerTranscriptFeature().follow`). */
export type FollowTranscript = (sessionId: string, listener: EntryListener) => Promise<() => void>

export function registerPermissionsFeature(ctx: DaemonContext, follow?: FollowTranscript) {
  const rulesLog = new RulesLog(paths.rulesLog())
  const messages = messagesFor(effectiveLocale(ctx.config))

  /** The session went past its dialog: a tool result or prompt in the transcript, or a turn hook. */
  const watch = (sessionId: string, onMove: () => void) => {
    let stopped = false
    let stopFollow: (() => void) | undefined
    const following = async () =>
      follow?.(sessionId, (_id, entry) => {
        if (entryMovesOn(entry)) onMove()
      })
    following()
      .then((stop) => {
        if (!stop) return
        if (stopped) stop()
        else stopFollow = stop
      })
      // No transcript yet (or unreadable): the turn hooks still end the handover.
      .catch((error) => ctx.logger.debug({ err: error, sessionId }, 'permission watch without transcript'))
    const offHook = ctx.bus.on('hook', (hook) => {
      if (hook.payload.session_id === sessionId && hookMovesOn(hook.event)) onMove()
    })
    return () => {
      stopped = true
      stopFollow?.()
      offHook()
    }
  }

  const broker = new PermissionBroker(ctx.hub, {
    timeoutMs: ctx.config.permissionTimeoutSec * 1000,
    questionTimeoutMs: ctx.config.questionTimeoutSec * 1000,
    watch,
    defaultScope: ctx.config.defaultRuleScope,
    profiles: ctx.profiles,
    denyMessage: messages.claudeCode.denied,
    keepPlanningMessage: messages.claudeCode.keepPlanning,
    onRequested: (info) => ctx.bus.emit('permission.requested', info),
    onResolved: (info, outcome) => {
      if (info.terminal) ctx.logger.info({ tool: info.tool, outcome }, 'handed-over permission request ended')
      ctx.bus.emit('permission.resolved', { info, outcome })
    },
    onHandover: (info, end) => {
      // Tool name only: inputs and answers are session content.
      ctx.logger.info({ tool: info.tool, end }, 'permission hook stopped waiting: answer in the terminal')
      ctx.bus.emit('permission.handover', info)
    },
    onReminder: (info) => ctx.bus.emit('permission.reminder', info),
    onRuleCreated: (rule) => {
      rulesLog.add(rule).catch((error) => ctx.logger.warn({ err: error }, 'could not log rule'))
      ctx.logger.info(rule, 'always-allow rule created from the app')
    },
  })

  ctx.hookReceiver.setResponder('PermissionRequest', (hook, signal) => broker.handle(hook, signal))
  ctx.router.register('permission.respond', (msg) => {
    broker.respond(msg.requestId, {
      behavior: msg.decision,
      always: msg.decision === 'allow' ? msg.always : undefined,
    })
    return undefined
  })
  ctx.router.register('permission.answer', (msg) => {
    broker.answer(msg.requestId, msg.answer)
    return undefined
  })
  // A phone that connects late still sees requests that are waiting.
  ctx.onClientConnected((connection) => {
    for (const request of broker.list()) connection.send({ type: 'permission.request', request })
  })
  ctx.onStop(() => broker.dispose())

  return { broker, rulesLog }
}
