import {
  type DaemonUpdateChannel,
  PROTOCOL_VERSION,
  type Profile,
  type PushMode,
} from '@remote-harness/protocol'
import type { FastifyInstance } from 'fastify'
import type { WebSocketServer } from 'ws'
import {
  type Config,
  loadConfig,
  profilesWithResolvableAgent,
  resolveProfiles,
  updateConfigFile,
} from './core/config.ts'
import { EventBus } from './core/event-bus.ts'
import type { DaemonEvents } from './core/events.ts'
import { KeyedMutex } from './core/keyed-mutex.ts'
import type { Logger } from './core/logger.ts'
import { pairingAddress, pairingUrl } from './core/pairing.ts'
import { displayHostName } from './core/paths.ts'
import { ensureHookSecret, ensureToken, generateToken, type TokenStore } from './core/secrets.ts'
import { DAEMON_VERSION } from './core/version.ts'
import { registerAttachmentsFeature } from './features/attachments/index.ts'
import { registerAutocompleteFeature } from './features/autocomplete/index.ts'
import { registerCheckoutFeature } from './features/checkout/index.ts'
import { registerDiagnosticsFeature } from './features/diagnostics/index.ts'
import { HookReceiver } from './features/hooks/receiver.ts'
import { registerInputFeature } from './features/input/index.ts'
import { registerLifecycleFeature } from './features/lifecycle/index.ts'
import { registerLiveStatusFeature } from './features/live-status/index.ts'
import { registerModeFeature } from './features/mode/index.ts'
import { registerMuteFeature } from './features/mute/index.ts'
import type { MuteStore } from './features/mute/store.ts'
import { registerPaneFeature } from './features/pane/index.ts'
import { registerPermissionsFeature } from './features/permissions/index.ts'
import { type KeepAwakeController, registerPowerFeature } from './features/power/index.ts'
import { registerProvidersFeature } from './features/providers/index.ts'
import { registerPushFeature } from './features/push/index.ts'
import type { PushSender } from './features/push/sender.ts'
import { registerQueueFeature } from './features/queue/index.ts'
import { registerSessionsFeature } from './features/sessions/index.ts'
import { justEnded } from './features/sessions/state.ts'
import { registerStatusLineFeature } from './features/status-line/index.ts'
import { registerSubagentsFeature } from './features/subagents/index.ts'
import { registerSystemPermissionsFeature } from './features/system-permissions/index.ts'
import { registerTranscriptFeature } from './features/transcript/index.ts'
import {
  type DesktopOptions,
  registerBlockedRemoteUpdates,
  registerUpdatesFeature,
  type TrayShellDeps,
} from './features/updates/index.ts'
import { registerVoicePolishFeature } from './features/voice-polish/index.ts'
import type { Executor } from './infra/exec.ts'
import { findTailscaleAddress } from './infra/network.ts'
import { resolvePlatform } from './infra/platform.ts'
import type { SleepInhibitor } from './infra/power.ts'
import { TmuxClient } from './infra/tmux.ts'
import { ClientHub, type Connection } from './transport/connection.ts'
import { createHooksServer } from './transport/hooks-server.ts'
import { MessageRouter } from './transport/router.ts'
import { startWsServer } from './transport/ws-server.ts'

export type DaemonOptions = {
  logger: Logger
  exec: Executor
  tokenStore: TokenStore
  /** Bind the WebSocket to 127.0.0.1 instead of the Tailscale address. */
  dev?: boolean
  /** Explicit bind address for the WebSocket (overrides Tailscale discovery). */
  host?: string
  /** Wait for the Tailscale interface instead of failing (service mode: avoids a launchd crash loop). */
  waitForTailscale?: boolean
  configPath?: string
  /** Overrides config ports (0 = random, used in tests). */
  wsPort?: number
  hookPort?: number
  pushSender?: PushSender | null
  /** Update checks and the tray icon: only for the service daemon (`start` without `--dev`). */
  desktop?: DesktopOptions
  /** Prevents idle sleep per `keepAwake`: only for the service daemon. */
  sleepInhibitor?: SleepInhibitor
  /** A profile's provider key from the OS secret store (`null` when none); absent = no keys (tests). */
  providerKey?: (profileId: string) => Promise<string | null>
}

export type RunningDaemon = {
  config: Config
  profiles: Profile[]
  wsHost: string
  wsPort: number
  hookPort: number
  stop(): Promise<void>
}

/** Shared services every feature module receives. */
export type DaemonContext = {
  config: Config
  profiles: Profile[]
  logger: Logger
  exec: Executor
  bus: EventBus<DaemonEvents>
  hub: ClientHub
  router: MessageRouter
  hooks: FastifyInstance
  hookReceiver: HookReceiver
  tmux: TmuxClient
  /** Registers cleanup run when the daemon stops. */
  onStop(fn: () => void | Promise<void>): void
  /** Registers a callback for every newly authenticated client (to replay pending state). */
  onClientConnected(fn: (connection: Connection) => void): void
  /** Overrides the Firebase sender (tests); undefined = load from the service account file. */
  pushSender?: PushSender | null
  /** A profile's provider key from the OS secret store; only ever handed to the provider itself. */
  providerKey: (profileId: string) => Promise<string | null>
}

export function resolveWsHost(options: Pick<DaemonOptions, 'dev' | 'host'>): string {
  if (options.host) return options.host
  if (options.dev) return '127.0.0.1'
  const address = findTailscaleAddress()
  if (!address) throw new Error(TAILSCALE_NOT_FOUND)
  return address
}

export const TAILSCALE_NOT_FOUND =
  'Tailscale not found (no 100.x interface). Install and connect Tailscale, or use --dev for 127.0.0.1.'

/** Resolves the WebSocket host, polling for the Tailscale interface when `waitForTailscale` is set. */
export async function waitForWsHost(
  options: Pick<DaemonOptions, 'dev' | 'host' | 'waitForTailscale' | 'logger'>,
  intervalMs = 5000,
  find: () => string | null = findTailscaleAddress,
): Promise<string> {
  if (options.host) return options.host
  if (options.dev) return '127.0.0.1'
  let warned = false
  for (;;) {
    const address = find()
    if (address) {
      if (warned) options.logger.info({ address }, 'Tailscale interface found')
      return address
    }
    if (!options.waitForTailscale) throw new Error(TAILSCALE_NOT_FOUND)
    if (!warned) options.logger.warn(`${TAILSCALE_NOT_FOUND} Waiting…`)
    warned = true
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

export async function startDaemon(options: DaemonOptions): Promise<RunningDaemon> {
  const { logger } = options
  resolvePlatform()
  const config = await loadConfig(logger, options.configPath)
  const profiles = await resolveProfiles(config, logger)
  // Narrower than `profiles`: only what the app may offer for starting a new session (not used
  // for `install`/`uninstall`, which manage a profile's launcher regardless of its CLI's PATH).
  const appProfiles = await profilesWithResolvableAgent(profiles, options.exec, logger)
  let token = await ensureToken(options.tokenStore)
  const hookSecret = await ensureHookSecret()

  const bus = new EventBus<DaemonEvents>()
  const hub = new ClientHub()
  const router = new MessageRouter(logger)
  const hooks = createHooksServer({ secret: hookSecret, logger })
  const hookReceiver = new HookReceiver(bus, profiles, logger)
  hookReceiver.register(hooks)
  const stopHandlers: Array<() => void | Promise<void>> = []
  const connectHandlers: Array<(connection: Connection) => void> = []
  const context: DaemonContext = {
    config,
    profiles,
    logger,
    exec: options.exec,
    bus,
    hub,
    router,
    hooks,
    hookReceiver,
    tmux: new TmuxClient(options.exec),
    onStop: (fn) => stopHandlers.push(fn),
    onClientConnected: (fn) => connectHandlers.push(fn),
    pushSender: options.pushSender,
    providerKey: options.providerKey ?? (async () => null),
  }

  router.register('ping', () => ({ type: 'pong' }))
  const reloadToken = async () => {
    token = await ensureToken(options.tokenStore)
    hub.closeAll(4003, 'token rotated')
    bus.emit('token.rotated', { token })
    logger.info('token reloaded, connections closed')
    return { ok: true }
  }
  hooks.post('/admin/reload-token', reloadToken)

  /** Where the app connects, set once the WebSocket server listens (after Tailscale is up). */
  let endpoint: { host: string; port: number } | null = null
  const features = await registerFeatures(context, options.desktop, options.sleepInhibitor ?? null, {
    pairing: () =>
      endpoint
        ? {
            url: pairingUrl(endpoint.host, endpoint.port, token),
            address: pairingAddress(endpoint.host, endpoint.port),
          }
        : null,
    rotateToken: async () => {
      await options.tokenStore.set(generateToken())
      await reloadToken()
    },
  })

  await hooks.listen({ host: '127.0.0.1', port: options.hookPort ?? config.hookPort })
  const hookAddress = hooks.server.address()
  const hookPort = typeof hookAddress === 'object' && hookAddress ? hookAddress.port : config.hookPort
  // Hooks are live before the app transport: Claude Code sessions must never hit a closed port
  // while the service waits for Tailscale.
  let wsHost: string
  try {
    wsHost = await waitForWsHost(options)
  } catch (error) {
    await hooks.close()
    for (const fn of stopHandlers.reverse()) await fn()
    throw error
  }

  const wss: WebSocketServer = await startWsServer({
    host: wsHost,
    port: options.wsPort ?? config.wsPort,
    getToken: () => token,
    router,
    hub,
    logger,
    onAuthenticated: (connection) => {
      for (const fn of connectHandlers) fn(connection)
    },
    hello: () => ({
      protocolVersion: PROTOCOL_VERSION,
      daemonVersion: DAEMON_VERSION,
      host: displayHostName(config),
      profiles: appProfiles,
      defaultRuleScope: config.defaultRuleScope,
      muted: features.mute.get(),
      push: { mode: features.pushMode() },
      update: { channel: features.updateChannel() },
      live: { follow: true },
    }),
  })
  const wsAddress = wss.address()
  const wsPort = typeof wsAddress === 'object' && wsAddress ? wsAddress.port : config.wsPort
  endpoint = { host: wsHost, port: wsPort }
  logger.info(
    { ws: `${wsHost}:${wsPort}`, hooks: `127.0.0.1:${hookPort}`, profiles: profiles.map((p) => p.id) },
    'daemon started',
  )

  return {
    config,
    profiles,
    wsHost,
    wsPort,
    hookPort,
    async stop() {
      hub.closeAll(1001, 'daemon stopping')
      await new Promise<void>((resolve) => wss.close(() => resolve()))
      await hooks.close()
      for (const fn of stopHandlers.reverse()) await fn()
    },
  }
}

/** Wires every feature module. Each feature registers its own handlers, hooks and listeners. */
async function registerFeatures(
  ctx: DaemonContext,
  desktop: DesktopOptions | undefined,
  sleepInhibitor: SleepInhibitor | null,
  pairing: Pick<TrayShellDeps, 'pairing' | 'rotateToken'>,
): Promise<{ mute: MuteStore; pushMode: () => PushMode; updateChannel: () => DaemonUpdateChannel }> {
  const sessions = registerSessionsFeature(ctx, ctx.tmux)
  const transcript = registerTranscriptFeature(ctx, sessions.store, (id, at) =>
    sessions.service.noteActivity(id, at),
  )
  registerSubagentsFeature(ctx, sessions.store, transcript.addResolver)
  registerStatusLineFeature(ctx, sessions.store)
  const sessionLock = new KeyedMutex()
  const attachments = registerAttachmentsFeature(ctx, sessions.store)
  const permissions = registerPermissionsFeature(ctx, transcript.follow)
  const hasPendingPermission = (id: string) => permissions.broker.hasPending(id)
  const input = registerInputFeature(ctx, sessions.store, sessionLock, attachments.store)
  const queue = registerQueueFeature(ctx, sessions.store, input.service, hasPendingPermission)
  registerModeFeature(ctx, sessions.store, sessionLock, hasPendingPermission)
  registerAutocompleteFeature(ctx, sessions.store)
  registerVoicePolishFeature(ctx, sessions.store)
  registerDiagnosticsFeature(ctx)
  registerPaneFeature(ctx, sessions.store)
  registerProvidersFeature(ctx, { key: ctx.providerKey })
  const checkout = registerCheckoutFeature(ctx, sessions.store)
  const lifecycle = registerLifecycleFeature(ctx, sessions.store, sessions.service, checkout.resolver, {
    lock: sessionLock,
    denyPending: (id) => void permissions.broker.denyAll(id),
  })
  registerSystemPermissionsFeature(ctx, (profileId) => lifecycle.service.projects(profileId))
  const mute = await registerMuteFeature(ctx)
  const isMuted = (profileId: string | null, sessionId: string) => mute.store.isMuted(profileId, sessionId)
  const isEnded = (sessionId: string) => sessions.store.get(sessionId)?.state === 'ended'
  // Whatever path ends a session (SessionEnd, pane gone, close), its pending requests go with it.
  sessions.store.onChange((session, previous) => {
    if (justEnded(session, previous)) permissions.broker.cancelAll(session.id)
  })
  const push = await registerPushFeature(ctx, { isMuted, isEnded, sender: ctx.pushSender })
  await registerLiveStatusFeature(ctx, {
    store: sessions.store,
    sender: push.sender,
    isMuted,
    follow: transcript.follow,
  })
  let updateChannel = () => ctx.config.update.channel
  // Registered after the updates feature (it needs the sessions restored): the tray reads it lazily.
  let power: KeepAwakeController | null = null
  let pushSetting = ctx.config.push
  if (desktop) {
    const updates = await registerUpdatesFeature(ctx, {
      store: sessions.store,
      hasPendingPermission: (id) => permissions.broker.hasPending(id),
      options: desktop,
      shell: {
        profiles: ctx.profiles,
        pendingPermissions: () => permissions.broker.list(),
        respond: (requestId, decision, always) => {
          const info = permissions.broker.list().find((p) => p.requestId === requestId)
          permissions.broker.respond(requestId, {
            behavior: decision,
            ...(always && decision === 'allow' && info?.suggestedRule
              ? { always: { rule: info.suggestedRule, scope: info.defaultScope } }
              : {}),
          })
        },
        phones: () => ({ count: push.devices.list().length, push: push.mode() !== 'off' }),
        closeSession: (id) => lifecycle.closer.close(id),
        renameSession: (id, name) => input.service.sendText(id, `/rename ${name}`),
        ...pairing,
        keepAwake: {
          mode: () => power?.state().mode ?? ctx.config.keepAwake,
          set: async (mode) => {
            await updateConfigFile({ keepAwake: mode })
            await power?.setMode(mode)
          },
        },
        push: {
          setting: () => pushSetting,
          set: async (setting) => {
            await updateConfigFile({ push: setting })
            pushSetting = setting
            await push.reloadMode()
          },
        },
      },
    })
    updateChannel = updates.channel
  } else {
    await registerBlockedRemoteUpdates(ctx)
  }
  await sessions.start()
  power = registerPowerFeature(ctx, sessions.store, sleepInhibitor)
  // After the sessions, so prompts queued for sessions that ended meanwhile are dropped.
  await queue.service.load().catch((error) => ctx.logger.warn({ err: error }, 'queue restore failed'))
  return { mute: mute.store, pushMode: push.mode, updateChannel: () => updateChannel() }
}
