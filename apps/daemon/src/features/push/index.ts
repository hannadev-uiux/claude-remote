import { effectiveLocale } from '../../core/config.ts'
import { messagesFor } from '../../core/i18n/index.ts'
import { paths } from '../../core/paths.ts'
import type { DaemonContext } from '../../main.ts'
import { DeviceRegistry } from './devices.ts'
import { createRelaySender } from './relay-sender.ts'
import { createFirebaseSender, type PushSender } from './sender.ts'
import { PushService } from './service.ts'

export async function registerPushFeature(
  ctx: DaemonContext,
  options: { isMuted: (profileId: string | null, sessionId: string) => boolean; sender?: PushSender | null },
) {
  const devices = new DeviceRegistry(paths.devices())
  await devices.load()
  const sender =
    options.sender !== undefined
      ? options.sender
      : // A local service account (self-hosted Firebase) wins; otherwise the phones' relay grants.
        ((await createFirebaseSender(paths.firebaseServiceAccount(), ctx.logger)) ??
        createRelaySender(ctx.logger))
  const service = new PushService(sender, devices, ctx.logger, {
    profiles: ctx.profiles,
    hasForegroundClient: () => ctx.hub.hasForegroundClient(),
    isMuted: options.isMuted,
    messages: messagesFor(effectiveLocale(ctx.config)).push,
  })

  ctx.router.register('device.register', async (msg) => {
    await devices.register(msg.fcmToken, msg.platform, msg.relay)
    return undefined
  })
  ctx.router.register('app.visibility', (msg, connection) => {
    connection.foreground = msg.foreground
    return undefined
  })
  ctx.bus.on('hook', (hook) => void service.notify(service.messageForHook(hook)))
  ctx.bus.on('permission.requested', (info) => void service.notify(service.messageForPermission(info)))
  return { service, devices, sender }
}
