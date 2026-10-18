import { effectiveLocale } from '../../core/config.ts'
import { messagesFor } from '../../core/i18n/index.ts'
import { hostName, shortenHome } from '../../core/paths.ts'
import type { DaemonContext } from '../../main.ts'
import type { PushSender } from '../push/sender.ts'
import type { SessionStore } from '../sessions/store.ts'
import type { EntryListener } from '../transcript/service.ts'
import { LiveStatusService } from './service.ts'
import { stepForEntry } from './status.ts'

/** Notification types that do not mean "waiting for you" (permissions come from PermissionRequest). */
const NOT_WAITING = new Set(['auth_success'])

export function registerLiveStatusFeature(
  ctx: DaemonContext,
  options: {
    store: SessionStore
    sender: PushSender | null
    isMuted: (profileId: string | null, sessionId: string) => boolean
    follow: (sessionId: string, listener: EntryListener) => Promise<() => void>
  },
) {
  const host = hostName()
  const service = new LiveStatusService(options.sender, ctx.logger, {
    messages: messagesFor(effectiveLocale(ctx.config)).live,
    profileOf: (sessionId) => options.store.get(sessionId)?.profileId ?? null,
    info: (sessionId, profileId) => {
      const session = options.store.get(sessionId)
      return {
        title: ctx.profiles.find((p) => p.id === profileId)?.name ?? profileId ?? 'Claude',
        host,
        session: session?.title ?? '',
        path: session ? shortenHome(session.cwd) : '',
      }
    },
    isMuted: options.isMuted,
    follow: (sessionId, onEvent) =>
      options.follow(sessionId, (_id, entry) => {
        const event = stepForEntry(entry)
        if (event) onEvent(event)
      }),
  })

  ctx.router.register('live.register', async (msg) => {
    await service.register({
      sessionId: msg.sessionId,
      platform: msg.platform,
      fcmToken: msg.fcmToken,
      ...(msg.activityToken ? { activityToken: msg.activityToken } : {}),
      ...(msg.relay ? { relay: msg.relay } : {}),
    })
    return undefined
  })
  ctx.router.register('live.unregister', (msg) => {
    service.unregister(msg.sessionId)
    return undefined
  })

  ctx.bus.on('hook', (hook) => {
    const sessionId = hook.payload.session_id
    switch (hook.event) {
      case 'UserPromptSubmit':
        return service.handle(sessionId, { type: 'prompt' })
      case 'Notification': {
        const type = hook.payload.notification_type
        if (typeof type === 'string' && NOT_WAITING.has(type)) return
        return service.handle(sessionId, { type: 'waiting', permission: type === 'permission_prompt' })
      }
      case 'Stop':
        return service.handle(sessionId, { type: 'stop' })
      case 'SessionEnd':
        return service.handle(sessionId, { type: 'end' })
    }
  })
  ctx.bus.on('permission.requested', (info) =>
    service.handle(info.sessionId, { type: 'waiting', permission: true }),
  )
  ctx.bus.on('permission.resolved', ({ info }) => service.handle(info.sessionId, { type: 'resumed' }))
  ctx.onStop(() => service.dispose())
  return { service }
}
