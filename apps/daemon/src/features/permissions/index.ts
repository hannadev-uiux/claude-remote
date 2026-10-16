import { effectiveLocale } from '../../core/config.ts'
import { messagesFor } from '../../core/i18n/index.ts'
import { paths } from '../../core/paths.ts'
import type { DaemonContext } from '../../main.ts'
import { PermissionBroker } from './broker.ts'
import { RulesLog } from './rules-log.ts'

export function registerPermissionsFeature(ctx: DaemonContext) {
  const rulesLog = new RulesLog(paths.rulesLog())
  const messages = messagesFor(effectiveLocale(ctx.config))
  const broker = new PermissionBroker(ctx.hub, {
    timeoutMs: ctx.config.permissionTimeoutSec * 1000,
    defaultScope: ctx.config.defaultRuleScope,
    profiles: ctx.profiles,
    denyMessage: messages.claudeCode.denied,
    keepPlanningMessage: messages.claudeCode.keepPlanning,
    onRequested: (info) => ctx.bus.emit('permission.requested', info),
    onResolved: (info, outcome) => ctx.bus.emit('permission.resolved', { info, outcome }),
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
