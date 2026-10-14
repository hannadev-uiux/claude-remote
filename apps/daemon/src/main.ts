import { PROTOCOL_VERSION, type Profile } from '@claude-remote/protocol'
import type { FastifyInstance } from 'fastify'
import type { WebSocketServer } from 'ws'
import { type Config, loadConfig, resolveProfiles } from './core/config.ts'
import { EventBus } from './core/event-bus.ts'
import type { DaemonEvents } from './core/events.ts'
import { KeyedMutex } from './core/keyed-mutex.ts'
import type { Logger } from './core/logger.ts'
import { ensureHookSecret, ensureToken, type TokenStore } from './core/secrets.ts'
import { DAEMON_VERSION } from './core/version.ts'
import { registerAutocompleteFeature } from './features/autocomplete/index.ts'
import { HookReceiver } from './features/hooks/receiver.ts'
import { registerInputFeature } from './features/input/index.ts'
import { registerLifecycleFeature } from './features/lifecycle/index.ts'
import { registerModeFeature } from './features/mode/index.ts'
import { registerMuteFeature } from './features/mute/index.ts'
import type { MuteStore } from './features/mute/store.ts'
import { registerPaneFeature } from './features/pane/index.ts'
import { registerPermissionsFeature } from './features/permissions/index.ts'
import { registerPushFeature } from './features/push/index.ts'
import type { PushSender } from './features/push/sender.ts'
import { registerSessionsFeature } from './features/sessions/index.ts'
import { registerSubagentsFeature } from './features/subagents/index.ts'
import { registerTranscriptFeature } from './features/transcript/index.ts'
import type { Executor } from './infra/exec.ts'
import { findTailscaleAddress } from './infra/network.ts'
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
}

export function resolveWsHost(options: Pick<DaemonOptions, 'dev' | 'host'>): string {
  if (options.host) return options.host
  if (options.dev) return '127.0.0.1'
  const address = findTailscaleAddress()
  if (!address) throw new Error(TAILSCALE_NOT_FOUND)
  return address
}

export const TAILSCALE_NOT_FOUND =
  'Tailscale não encontrado (nenhuma interface 100.x). Instale e conecte o Tailscale, ou use --dev para 127.0.0.1.'

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
    if (!warned) options.logger.warn(`${TAILSCALE_NOT_FOUND} Aguardando…`)
    warned = true
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

export async function startDaemon(options: DaemonOptions): Promise<RunningDaemon> {
  const { logger } = options
  const config = await loadConfig(logger, options.configPath)
  const profiles = await resolveProfiles(config, logger)
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
  }

  router.register('ping', () => ({ type: 'pong' }))
  hooks.post('/admin/reload-token', async () => {
    token = await ensureToken(options.tokenStore)
    hub.closeAll(4003, 'token rotated')
    bus.emit('token.rotated', { token })
    logger.info('token reloaded, connections closed')
    return { ok: true }
  })

  const features = await registerFeatures(context)

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
      profiles,
      defaultRuleScope: config.defaultRuleScope,
      muted: features.mute.get(),
    }),
  })
  const wsAddress = wss.address()
  const wsPort = typeof wsAddress === 'object' && wsAddress ? wsAddress.port : config.wsPort
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
async function registerFeatures(ctx: DaemonContext): Promise<{ mute: MuteStore }> {
  const sessions = registerSessionsFeature(ctx, ctx.tmux)
  const transcript = registerTranscriptFeature(ctx, sessions.store)
  registerSubagentsFeature(ctx, sessions.store, transcript.addResolver)
  const sessionLock = new KeyedMutex()
  registerInputFeature(ctx, sessions.store, sessionLock)
  const permissions = registerPermissionsFeature(ctx)
  registerModeFeature(ctx, sessions.store, sessionLock, (id) => permissions.broker.hasPending(id))
  registerAutocompleteFeature(ctx, sessions.store)
  registerPaneFeature(ctx, sessions.store)
  registerLifecycleFeature(ctx, sessions.store, sessions.service)
  const mute = await registerMuteFeature(ctx)
  await registerPushFeature(ctx, {
    isMuted: (profileId, sessionId) => mute.store.isMuted(profileId, sessionId),
    sender: ctx.pushSender,
  })
  await sessions.start()
  return { mute: mute.store }
}
