import { homedir } from 'node:os'
import { join } from 'node:path'
import type { DaemonUpdateBlocker, PermissionRequestInfo, Profile } from '@remote-harness/protocol'
import {
  effectiveLocale,
  isKeepAwakeMode,
  type KeepAwakeMode,
  loadConfig,
  updateConfigFile,
} from '../../core/config.ts'
import { messagesFor } from '../../core/i18n/index.ts'
import { displayHostName, paths, shortenHome } from '../../core/paths.ts'
import { DAEMON_VERSION } from '../../core/version.ts'
import { createDesktop, runDetachedUpdate } from '../../infra/desktop.ts'
import { currentWsl, resolvePlatform } from '../../infra/platform.ts'
import { spawnJsonLines, trayAssetsDir, trayCommand } from '../../infra/tray-helper.ts'
import type { DaemonContext } from '../../main.ts'
import { showInTerminal } from '../pane/show-in-terminal.ts'
import type { PushSetting } from '../push/mode.ts'
import { LaunchdService } from '../service/launchd.ts'
import type { ServiceManager } from '../service/service-manager.ts'
import { stopService } from '../service/stop.ts'
import type { SessionStore } from '../sessions/store.ts'
import { installServiceFromCli } from '../setup/install.ts'
import { installerSourceDir, SourceUpdater, type UpdateSource, updateSource } from '../update/update.ts'
import { isQuietMoment, isUpdateChannel, underServiceManager, updateLabel } from './channel.ts'
import { type AvailableUpdate, UpdateChecker } from './checker.ts'
import {
  buildTrayMenu,
  CHANNEL_ACTION_PREFIX,
  KEEP_AWAKE_ACTION_PREFIX,
  pendingSummary,
  TRAY_ACTIONS,
  TRAY_PREFIXES,
  type TrayPending,
  type TrayProfile,
  type TraySession,
} from './menu.ts'
import { type LaunchResult, launchRefusal, RemoteUpdates } from './remote.ts'
import { TrayHost } from './tray-host.ts'

/** Given only to the service daemon (`start` without `--dev`). */
export type DesktopOptions = {
  /** dist/cli.js of this build (null from sources: no update checks). */
  cliPath: string | null
  /** Stops the daemon and exits; the service manager starts it again. */
  restart: () => void
}

/** What the tray shell needs besides the update state. */
export type TrayShellDeps = {
  profiles: readonly Profile[]
  /** Pending permission requests, oldest first by `createdAt` after sorting. */
  pendingPermissions: () => PermissionRequestInfo[]
  /** Answers a request like the app does; `always` saves the suggested rule. */
  respond: (requestId: string, decision: 'allow' | 'deny', always: boolean) => void
  /** Registered phones and whether push is configured. */
  phones: () => { count: number; push: boolean }
  /** Graceful close of a session (change 57). */
  closeSession: (sessionId: string) => Promise<unknown>
  /** Delivers `/rename <name>` to a controllable session's pane, like any other input. */
  renameSession: (sessionId: string, name: string) => Promise<void>
  /** The pairing link and `host:port` once the daemon listens for the app. */
  pairing: () => { url: string; address: string } | null
  /** Stores a new token and closes the app connections (phones pair again). */
  rotateToken: () => Promise<void>
  keepAwake: { mode: () => KeepAwakeMode; set: (mode: KeepAwakeMode) => Promise<void> }
  /** The config's `push` setting, and writing + applying a new one. */
  push: { setting: () => PushSetting; set: (setting: PushSetting) => Promise<void> }
}

/** First check after start, then how often due checks and automatic updates are evaluated. */
const FIRST_CHECK_MS = 2 * 60 * 1000
const TICK_MS = 10 * 60 * 1000
/** Session and permission changes rebuild the menu at most this often. */
const MENU_REFRESH_MS = 300
const DOCS_URL = 'https://remoteharness.app/docs'

export async function registerUpdatesFeature(
  ctx: DaemonContext,
  deps: {
    store: SessionStore
    hasPendingPermission: (sessionId: string) => boolean
    options: DesktopOptions
    shell?: TrayShellDeps
  },
) {
  const platform = resolvePlatform()
  const wsl = currentWsl(platform) !== null
  const desktop = createDesktop(ctx.exec, platform, { wsl })
  const locale = effectiveLocale(ctx.config)
  const m = messagesFor(locale).updates
  const source = updateSource(deps.options.cliPath, installerSourceDir())
  let settings = {
    update: ctx.config.update,
    tray: ctx.config.tray,
    trayPermissions: ctx.config.trayPermissions,
    machineName: ctx.config.machineName,
  }
  let updating = false
  /** Commit whose update failed: automatic updates do not retry it (the menu still can). */
  let failedCommit: string | null = null
  const startedAt = new Date()
  /** The helper reported it can open the Preferences/Sessions windows (macOS). */
  let helperWindows = false
  /** Renamed while not controllable: sent as `/rename` once the session is controllable again. */
  const pendingRenames = new Set<string>()

  /** launchd on macOS; "Start at login" has no Linux/Windows helper yet (#230 is macOS-first). */
  const startAtLoginManager = (): ServiceManager | null =>
    platform === 'darwin'
      ? new LaunchdService(ctx.exec, {
          home: homedir(),
          appDir: paths.app(),
          legacyAppDir: paths.legacyApp(),
          buildDir: paths.launcher(),
        })
      : null
  let startAtLoginState: boolean | null = null
  const refreshStartAtLogin = async () => {
    const manager = startAtLoginManager()
    startAtLoginState = manager ? (await manager.status()).loaded : null
    refreshMenu()
  }

  const notifyAvailable = (available: AvailableUpdate) => {
    const version = updateLabel(available, DAEMON_VERSION)
    return available.downgrade
      ? desktop.notify(m.older(version), m.olderBody)
      : desktop.notify(m.available(version), m.availableBody)
  }
  const checker = source.ok
    ? new UpdateChecker({
        fetch: (ref) => new SourceUpdater(ctx.exec, source.root).fetch(ref),
        head: () => new SourceUpdater(ctx.exec, source.root).head(),
        statePath: paths.updates(),
        currentVersion: DAEMON_VERSION,
        logger: ctx.logger,
        onAvailable: notifyAvailable,
      })
    : null
  await checker?.load()
  if (!source.ok) ctx.logger.info({ reason: source.reason }, 'update checks off (not the installer checkout)')

  const tray = settings.tray
    ? new TrayHost(
        async () => {
          const command = await trayCommand({
            platform,
            wsl,
            env: process.env,
            exec: ctx.exec,
            assetsDir: trayAssetsDir(),
            buildDir: paths.tray(),
          })
          if ('unavailable' in command) {
            ctx.logger.info({ reason: command.unavailable }, 'tray unavailable, running headless')
            return null
          }
          return spawnJsonLines(command.command, command.args, {
            onStderr: (line) => ctx.logger.debug({ tray: line }, 'tray helper output'),
          })
        },
        (id, value) => void onTrayClick(id, value),
        ctx.logger,
        undefined,
        (windows) => {
          helperWindows = windows
          if (windows) void refreshStartAtLogin()
          refreshMenu()
        },
      )
    : null

  /** The shell sections: sessions by recency, the oldest pending tool permission, the phones. */
  const shellState = () => {
    const shell = deps.shell
    if (!shell) return {}
    const profileName = (id: string) => shell.profiles.find((p) => p.id === id)?.name ?? id
    const sessions: TraySession[] = deps.store.all().map((s) => ({
      id: s.id,
      title: s.title || s.cwd,
      folder: shortenHome(s.cwd),
      profile: profileName(s.profileId),
      state: s.state,
      worktree: s.cwd.includes('/.claude/worktrees/'),
      controllable: s.controllable,
      agent: s.agent ?? 'claude',
      updatedAt: s.updatedAt,
    }))
    const profiles: TrayProfile[] = shell.profiles.map((p) => ({
      id: p.id,
      name: p.name,
      agent: p.agent ?? 'claude',
      color: p.color,
    }))
    const oldest = shell
      .pendingPermissions()
      // Questions are answered in the app; handed-over requests in the terminal right here.
      .filter((p) => !p.interaction && !p.terminal)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]
    const pending: TrayPending | null = oldest
      ? {
          requestId: oldest.requestId,
          sessionId: oldest.sessionId,
          title: deps.store.get(oldest.sessionId)?.title || profileName(oldest.profileId),
          profile: profileName(oldest.profileId),
          summary: pendingSummary(oldest),
          canAlways: oldest.suggestedRule !== null,
        }
      : null
    return {
      machine: displayHostName(settings),
      since: startedAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
      sessions,
      profiles,
      pending,
      phones: shell.phones(),
      canStart: shell.profiles.length > 0,
      pairing: shell.pairing(),
      qr: platform === 'darwin',
      windows: helperWindows,
      prefs: {
        permissions: settings.trayPermissions,
        keepAwake: shell.keepAwake.mode(),
        push: shell.push.setting() !== 'off',
        machineName: displayHostName(settings),
        showInMenuBar: settings.tray,
        startAtLogin: startAtLoginState,
      },
      canStopService: underServiceManager(),
    }
  }

  const refreshMenu = () =>
    tray?.update(
      buildTrayMenu(
        {
          version: DAEMON_VERSION,
          channel: settings.update.channel,
          auto: settings.update.auto,
          available: checker?.state.available
            ? {
                version: updateLabel(checker.state.available, DAEMON_VERSION),
                downgrade: checker.state.available.downgrade,
              }
            : null,
          checking: checker?.checking ?? false,
          updating,
          canUpdate: checker !== null,
          canRestart: underServiceManager(),
          ...shellState(),
        },
        m.tray,
      ),
    )

  // A busy session must not flood the helper: changes coalesce into one rebuild.
  let refreshTimer: NodeJS.Timeout | undefined
  const scheduleRefresh = () => {
    if (!tray || refreshTimer) return
    refreshTimer = setTimeout(() => {
      refreshTimer = undefined
      refreshMenu()
    }, MENU_REFRESH_MS)
    refreshTimer.unref()
  }

  // Running: this process spawned the updater and it has not exited, or the run record is still
  // going (an updater under systemd, or one started by another daemon process).
  const refusal = () =>
    launchRefusal({
      updating: updating || remote.running(),
      installer: source.ok && deps.options.cliPath !== null,
      available: Boolean(checker?.state.available),
    })

  /** Starts the detached `remote-harness update`; `begin` checked `refusal()` first. */
  const launch = (onFailure: (code: number | null) => void): LaunchResult => {
    const available = checker?.state.available
    const cliPath = deps.options.cliPath
    if (refusal() || !available || !cliPath) return { ok: false, error: 'nothing to update' }
    updating = true
    ctx.logger.info({ version: available.version, channel: settings.update.channel }, 'updating')
    void desktop.notify(m.updating(updateLabel(available, DAEMON_VERSION)), '')
    try {
      runDetachedUpdate({
        nodePath: process.execPath,
        cliPath,
        ref: settings.update.channel,
        logFile: join(paths.logs(), 'update.log'),
        systemdRun: Boolean(process.env.INVOCATION_ID),
        // A successful update restarts this daemon: still being here means it was not replaced, so
        // the next update must be able to start whatever the exit code. (Under systemd this is
        // `systemd-run`, which returns once the unit started: the run record tells the rest.)
        onExit: (code) => {
          updating = false
          refreshMenu()
          if (code === 0) return
          ctx.logger.warn({ code, log: join(paths.logs(), 'update.log') }, 'update failed')
          failedCommit = available.commit
          onFailure(code)
        },
      })
    } catch (error) {
      ctx.logger.warn({ err: error }, 'could not start the update')
      updating = false
      failedCommit = available.commit
      refreshMenu()
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
    refreshMenu()
    return { ok: true }
  }

  /** The tray's "Update now" and automatic updates take the same recorded path as the app. */
  const runUpdate = () => {
    if (updating || !checker?.state.available) return
    void remote.begin()
  }

  /** Automatic updates restart the daemon: only when nobody is waiting on Claude, never a downgrade. */
  const maybeAutoUpdate = () => {
    const available = checker?.state.available
    if (!settings.update.auto || !available || available.downgrade || available.commit === failedCommit)
      return
    if (isQuietMoment(deps.store.all(), deps.hasPendingPermission)) runUpdate()
  }

  const check = async (force = false) => {
    if (!checker) return checker
    const pending = checker.check(settings.update.channel, force)
    refreshMenu()
    remote.broadcast()
    await pending
    refreshMenu()
    remote.broadcast()
    maybeAutoUpdate()
    return checker
  }

  const reload = async () => {
    const config = await loadConfig(ctx.logger)
    const channelChanged = config.update.channel !== settings.update.channel
    settings = {
      update: config.update,
      tray: config.tray,
      trayPermissions: config.trayPermissions,
      machineName: config.machineName,
    }
    refreshMenu()
    remote.broadcast()
    if (channelChanged) await check(true)
    else maybeAutoUpdate()
  }

  const saveUpdateSettings = async (patch: Partial<typeof settings.update>) => {
    await updateConfigFile({ update: { ...settings.update, ...patch } })
    await reload()
  }

  const remote = new RemoteUpdates({
    hub: ctx.hub,
    router: ctx.router,
    logger: ctx.logger,
    runPath: paths.updateRun(),
    current: DAEMON_VERSION,
    blocked: updateBlocker(source, underServiceManager()),
    channel: () => settings.update.channel,
    checker: () => (checker ? { state: checker.state, checking: checker.checking } : null),
    busy: () => !isQuietMoment(deps.store.all(), deps.hasPendingPermission),
    check: (force) => check(force),
    saveChannel: (channel) => saveUpdateSettings({ channel }),
    refusal,
    launch,
    // A run that finished while this daemon still runs did not replace it ("Already up to date", or
    // a failure): the offer may be stale, so look at the channel again now.
    onFinished: (run) => {
      updating = false
      ctx.logger.info(
        { step: run.step, channel: settings.update.channel },
        'update finished without a restart',
      )
      void checker?.recheck(settings.update.channel).then(() => {
        refreshMenu()
        remote.broadcast()
      })
    },
  })
  await remote.load()
  remote.register()

  const focusSession = async (sessionId: string) => {
    const session = deps.store.get(sessionId)
    if (session?.paneId) await showInTerminal(ctx.tmux, desktop, platform, wsl, session.paneId)
  }

  const quote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`

  async function onTrayClick(id: string, value?: string) {
    const shell = deps.shell
    try {
      if (id === TRAY_ACTIONS.check) await check(true)
      else if (id === TRAY_ACTIONS.update) runUpdate()
      else if (id === TRAY_ACTIONS.auto) await saveUpdateSettings({ auto: !settings.update.auto })
      else if (id === TRAY_ACTIONS.logs) await desktop.open(paths.logs())
      else if (id === TRAY_ACTIONS.doctor)
        await desktop.runInTerminal(`${quote(join(paths.bin(), 'remote-harness'))} doctor`)
      else if (id === TRAY_ACTIONS.restart && underServiceManager()) deps.options.restart()
      else if (id === TRAY_ACTIONS.quit) tray?.stop()
      else if (id === TRAY_ACTIONS.quitService && underServiceManager()) {
        // The service manager stops this daemon (SIGTERM) right after; the icon goes first.
        tray?.stop()
        await stopService(ctx.exec)
      } else if (id === TRAY_ACTIONS.rotateToken && shell) {
        await shell.rotateToken()
        refreshMenu()
      } else if (id === TRAY_ACTIONS.prefPermissions) {
        await updateConfigFile({ trayPermissions: !settings.trayPermissions })
        await reload()
      } else if (id === TRAY_ACTIONS.prefPush && shell) {
        await shell.push.set(shell.push.setting() === 'off' ? 'auto' : 'off')
        refreshMenu()
      } else if (id.startsWith(KEEP_AWAKE_ACTION_PREFIX) && shell) {
        const mode = id.slice(KEEP_AWAKE_ACTION_PREFIX.length)
        if (isKeepAwakeMode(mode)) await shell.keepAwake.set(mode)
        refreshMenu()
      } else if (id === TRAY_ACTIONS.newSession) {
        const profile = shell?.profiles[0]
        if (profile) await desktop.runInTerminal(quote(join(paths.bin(), profile.id)))
      } else if (id === TRAY_ACTIONS.pair)
        await desktop.runInTerminal(`${quote(join(paths.bin(), 'remote-harness'))} pair`)
      else if (id === TRAY_ACTIONS.docs) await desktop.open(DOCS_URL)
      else if (id === TRAY_ACTIONS.prefs) await desktop.open(paths.config())
      else if (id.startsWith(CHANNEL_ACTION_PREFIX)) {
        const channel = id.slice(CHANNEL_ACTION_PREFIX.length)
        if (isUpdateChannel(channel)) await saveUpdateSettings({ channel })
      } else if (id.startsWith(TRAY_PREFIXES.allow))
        shell?.respond(id.slice(TRAY_PREFIXES.allow.length), 'allow', false)
      else if (id.startsWith(TRAY_PREFIXES.always))
        shell?.respond(id.slice(TRAY_PREFIXES.always.length), 'allow', true)
      else if (id.startsWith(TRAY_PREFIXES.deny))
        shell?.respond(id.slice(TRAY_PREFIXES.deny.length), 'deny', false)
      else if (id.startsWith(TRAY_PREFIXES.focus)) await focusSession(id.slice(TRAY_PREFIXES.focus.length))
      else if (id.startsWith(TRAY_PREFIXES.close))
        await shell?.closeSession(id.slice(TRAY_PREFIXES.close.length))
      else if (id.startsWith(TRAY_PREFIXES.rename) && shell) {
        const sessionId = id.slice(TRAY_PREFIXES.rename.length)
        const name = value?.trim()
        if (!name) return
        if (deps.store.get(sessionId)?.controllable) await shell.renameSession(sessionId, name)
        else {
          deps.store.upsert(sessionId, { title: name })
          pendingRenames.add(sessionId)
        }
      } else if (id === TRAY_ACTIONS.prefMachineName) {
        await updateConfigFile({ machineName: value?.trim() || undefined })
        await reload()
      } else if (id === TRAY_ACTIONS.prefShowInMenuBar) {
        await updateConfigFile({ tray: false })
        tray?.stop()
      } else if (id === TRAY_ACTIONS.prefStartAtLogin) {
        const manager = startAtLoginManager()
        if (manager) {
          if ((await manager.status()).loaded) await manager.uninstall()
          else if (deps.options.cliPath)
            await installServiceFromCli({
              exec: ctx.exec,
              cliPath: deps.options.cliPath,
              nodePath: process.execPath,
              platform,
              rcFiles: [],
              service: manager,
            })
          await refreshStartAtLogin()
        }
      }
    } catch (error) {
      ctx.logger.warn({ err: error, action: id }, 'tray action failed')
    }
  }

  ctx.hooks.post('/admin/updates-reload', async () => {
    await reload()
    return { ok: true }
  })
  ctx.hooks.post('/admin/updates-check', async () => {
    const result = await check(true)
    return { state: result?.state ?? null }
  })

  if (deps.shell) {
    const shell = deps.shell
    deps.store.onChange(scheduleRefresh)
    // A session renamed while not controllable gets the alias sent as `/rename` once it has a pane.
    deps.store.onChange((session, previous) => {
      if (!pendingRenames.has(session.id) || !session.controllable || previous?.controllable) return
      pendingRenames.delete(session.id)
      void shell.renameSession(session.id, session.title).catch((error: unknown) => {
        ctx.logger.warn({ err: error, sessionId: session.id }, 'rename on resume failed')
      })
    })
    ctx.bus.on('permission.requested', scheduleRefresh)
    ctx.bus.on('permission.resolved', scheduleRefresh)
    ctx.bus.on('permission.handover', scheduleRefresh)
  }

  void tray?.launch().then(refreshMenu)
  refreshMenu()
  const first = setTimeout(() => void check(), FIRST_CHECK_MS)
  const tick = setInterval(() => void check(), TICK_MS)
  first.unref()
  tick.unref()
  ctx.onStop(() => {
    clearTimeout(first)
    clearInterval(tick)
    clearTimeout(refreshTimer)
    tray?.stop()
    remote.stop()
  })
  return { checker, tray, channel: () => settings.update.channel }
}

/** Why this daemon cannot update itself, or null. */
export function updateBlocker(source: UpdateSource, serviceManaged: boolean): DaemonUpdateBlocker | null {
  if (!source.ok) return source.reason
  return serviceManaged ? null : 'no-service'
}

/**
 * Development and foreground daemons cannot restart themselves: they answer the update messages
 * with the blocker so the app shows the terminal command.
 */
export async function registerBlockedRemoteUpdates(ctx: DaemonContext): Promise<RemoteUpdates> {
  const remote = new RemoteUpdates({
    hub: ctx.hub,
    router: ctx.router,
    logger: ctx.logger,
    runPath: paths.updateRun(),
    current: DAEMON_VERSION,
    blocked: 'no-service',
    channel: () => ctx.config.update.channel,
    checker: () => null,
    busy: () => false,
    check: async () => undefined,
    saveChannel: async () => undefined,
    refusal: () => 'not-installer',
    launch: () => ({ ok: false, error: 'no-service' }),
  })
  await remote.load()
  remote.register()
  ctx.onStop(() => remote.stop())
  return remote
}
