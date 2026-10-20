import type { LiveFollowDevice } from '@remote-harness/protocol'
import { effectiveLocale } from '../../core/config.ts'
import { DaemonError } from '../../core/errors.ts'
import { messagesFor } from '../../core/i18n/index.ts'
import { displayHostName, paths, shortenHome } from '../../core/paths.ts'
import type { DaemonContext } from '../../main.ts'
import type { PushSender } from '../push/sender.ts'
import { justEnded } from '../sessions/state.ts'
import type { SessionStore } from '../sessions/store.ts'
import type { EntryListener } from '../transcript/service.ts'
import {
  addFollow,
  autoFollowersOf,
  dropExpired,
  dropSession,
  type FollowDevice,
  FollowStore,
  followedBy,
  followersOf,
  removeFollow,
  setAutoFollow,
  shouldStartFollowed,
  startPlan,
  touchSession,
  upsertDevice,
} from './follows.ts'
import { LiveStatusService } from './service.ts'
import { parallelTasks, stepForEntry } from './status.ts'

/** How often expired follows are dropped. */
const FOLLOW_SWEEP_MS = 10 * 60_000

/** Notification types that do not mean "waiting for you" (permissions come from PermissionRequest). */
const NOT_WAITING = new Set(['auth_success'])

export async function registerLiveStatusFeature(
  ctx: DaemonContext,
  options: {
    store: SessionStore
    sender: PushSender | null
    isMuted: (profileId: string | null, sessionId: string) => boolean
    follow: (sessionId: string, listener: EntryListener) => Promise<() => void>
  },
) {
  const host = displayHostName(ctx.config)
  const messages = messagesFor(effectiveLocale(ctx.config))
  const service = new LiveStatusService(options.sender, ctx.logger, {
    messages: messages.live,
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
    tasksOf: (sessionId) => {
      const session = options.store.get(sessionId)
      return session ? parallelTasks(session) : 0
    },
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
      ...(msg.palette ? { palette: msg.palette } : {}),
      ...(msg.androidDataMessages ? { androidDataMessages: true } : {}),
    })
    return undefined
  })
  // Background tasks and subagents change outside the hooks: the count follows the session store.
  const offStore = options.store.onChange((session, previous) => {
    // Pane gone or closed without a SessionEnd hook: the live status ends with the session too.
    if (justEnded(session, previous)) {
      if (service.has(session.id)) service.handle(session.id, { type: 'end' })
      return
    }
    const count = parallelTasks(session)
    if (service.has(session.id) && (!previous || parallelTasks(previous) !== count)) {
      service.handle(session.id, { type: 'tasks', count })
    }
  })

  ctx.router.register('live.unregister', (msg) => {
    service.unregister(msg.sessionId)
    return undefined
  })

  // Follows: per phone, persisted, so desktop turns start the live status in the background.
  const follows = new FollowStore(paths.liveFollows())
  await follows.load()
  const followed = (fcmToken: string) => ({
    type: 'live.followed' as const,
    ...followedBy(follows.get(), fcmToken),
  })
  ctx.router.register('live.follow', async (msg) => {
    const session = options.store.get(msg.sessionId)
    if (!session || session.state === 'ended') throw new DaemonError('not_found', 'session not found')
    await follows.update((state) =>
      addFollow(upsertDevice(state, msg.device), msg.device.fcmToken, msg.sessionId, Date.now()),
    )
    return followed(msg.device.fcmToken)
  })
  ctx.router.register('live.unfollow', async (msg) => {
    await follows.update((state) => removeFollow(state, msg.fcmToken, msg.sessionId))
    return followed(msg.fcmToken)
  })
  ctx.router.register('live.autoFollow', async (msg) => {
    await follows.update((state) =>
      setAutoFollow(upsertDevice(state, msg.device), msg.device.fcmToken, msg.profileId, msg.enabled),
    )
    return followed(msg.device.fcmToken)
  })
  ctx.router.register('live.follows', async (msg) => {
    await follows.update((state) => dropExpired(upsertDevice(state, msg.device), Date.now()))
    return followed(msg.device.fcmToken)
  })

  const registrationFor = (sessionId: string, device: LiveFollowDevice) => ({
    sessionId,
    platform: device.platform,
    fcmToken: device.fcmToken,
    ...(device.relay ? { relay: device.relay } : {}),
    ...(device.palette ? { palette: device.palette } : {}),
    ...(device.androidDataMessages ? { androidDataMessages: true } : {}),
  })

  /** Starts a followed session's live status on one phone, the way that phone allows. */
  const startOn = async (sessionId: string, device: FollowDevice) => {
    const session = options.store.get(sessionId)
    const profileId = session?.profileId ?? null
    const profileName = ctx.profiles.find((p) => p.id === profileId)?.name ?? profileId ?? 'Claude'
    switch (startPlan(device)) {
      case 'android':
        return service.register(registrationFor(sessionId, device))
      case 'push-to-start':
        return service.startByPush(registrationFor(sessionId, device), {
          startToken: device.startToken ?? '',
          ...(device.startRelay ? { startRelay: device.startRelay } : {}),
          url: `claude-remote://session/${sessionId}`,
          alert: { title: session?.title || profileName, body: messages.live.states.working },
        })
      case 'push':
        await options.sender?.send(
          [{ token: device.fcmToken, ...(device.relay ? { relay: device.relay } : {}) }],
          {
            title: messages.push.sessionWorking,
            body: profileName,
            data: { sessionId, profileId: profileId ?? '', event: 'UserPromptSubmit' },
          },
        )
    }
  }

  /** A new turn of a followed session: keep it followed, and start its live status when nothing shows it. */
  const onFollowedTurn = async (sessionId: string) => {
    const now = Date.now()
    const devices = followersOf(follows.get(), sessionId, now)
    if (devices.length === 0) return
    await follows.update((state) => touchSession(state, sessionId, now))
    const profileId = options.store.get(sessionId)?.profileId ?? null
    const start = shouldStartFollowed({
      registered: service.has(sessionId),
      foreground: ctx.hub.hasForegroundClient(),
      muted: options.isMuted(profileId, sessionId),
    })
    if (!start) return
    for (const device of devices) {
      await startOn(sessionId, device).catch((error: unknown) =>
        ctx.logger.warn({ err: error, sessionId }, 'live status: followed start failed'),
      )
    }
  }

  // Ended sessions are no longer followed; new ones are, on the phones that follow their profile.
  const offFollowStore = options.store.onChange((session, previous) => {
    if (justEnded(session, previous)) {
      void follows.update((state) => dropSession(state, session.id))
      return
    }
    if (previous || session.state === 'ended') return
    const devices = autoFollowersOf(follows.get(), session.profileId)
    if (devices.length === 0) return
    const now = Date.now()
    void follows.update((state) =>
      devices.reduce((next, device) => addFollow(next, device.fcmToken, session.id, now), state),
    )
  })
  const sweep = setInterval(
    () => void follows.update((state) => dropExpired(state, Date.now())),
    FOLLOW_SWEEP_MS,
  )
  sweep.unref?.()

  ctx.bus.on('hook', (hook) => {
    const sessionId = hook.payload.session_id
    // Late hooks of an ended session (the registry already applied any revival) update nothing.
    const ended = options.store.get(sessionId)?.state === 'ended'
    if (ended && hook.event !== 'SessionEnd') return
    switch (hook.event) {
      case 'UserPromptSubmit':
        service.handle(sessionId, { type: 'prompt' })
        void onFollowedTurn(sessionId)
        return
      case 'Notification': {
        const type = hook.payload.notification_type
        if (typeof type === 'string' && NOT_WAITING.has(type)) return
        return service.handle(sessionId, { type: 'waiting', permission: type === 'permission_prompt' })
      }
      case 'Stop':
        return service.handle(sessionId, { type: 'stop' })
      case 'SessionEnd':
        void follows.update((state) => dropSession(state, sessionId))
        return service.handle(sessionId, { type: 'end' })
    }
  })
  // Tool permissions can be answered from the lock screen; questions and plans only in the app.
  ctx.bus.on('permission.requested', (info) =>
    service.handle(info.sessionId, {
      type: 'waiting',
      permission: true,
      ...(info.interaction ? {} : { pending: { requestId: info.requestId, tool: info.tool } }),
    }),
  )
  // Handed over to the terminal: still waiting, but the lock screen can no longer answer it.
  ctx.bus.on('permission.handover', (info) =>
    service.handle(info.sessionId, { type: 'waiting', permission: true, pending: null }),
  )
  ctx.bus.on('permission.resolved', ({ info }) => service.handle(info.sessionId, { type: 'resumed' }))
  ctx.onStop(() => {
    offStore()
    offFollowStore()
    clearInterval(sweep)
    service.dispose()
  })
  return { service }
}
