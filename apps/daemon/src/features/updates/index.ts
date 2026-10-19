import { join } from 'node:path'
import type { PermissionRequestInfo, Profile } from '@remote-harness/protocol'
import { effectiveLocale, loadConfig, updateConfigFile } from '../../core/config.ts'
import { messagesFor } from '../../core/i18n/index.ts'
import { hostName, paths, shortenHome } from '../../core/paths.ts'
import { DAEMON_VERSION } from '../../core/version.ts'
import { createDesktop, runDetachedUpdate } from '../../infra/desktop.ts'
import { currentWsl, resolvePlatform } from '../../infra/platform.ts'
import { spawnJsonLines, trayAssetsDir, trayCommand } from '../../infra/tray-helper.ts'
import type { DaemonContext } from '../../main.ts'
import type { SessionStore } from '../sessions/store.ts'
import { installerSourceDir, SourceUpdater, updateSource } from '../update/update.ts'
import { isQuietMoment, isUpdateChannel, underServiceManager, updateLabel } from './channel.ts'
import { type AvailableUpdate, UpdateChecker } from './checker.ts'
import {
  buildTrayMenu,
  CHANNEL_ACTION_PREFIX,
  pendingSummary,
  TRAY_ACTIONS,
  TRAY_PREFIXES,
  type TrayPending,
  type TraySession,
} from './menu.ts'
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
  let settings = { update: ctx.config.update, tray: ctx.config.tray }
  let updating = false
  /** Commit whose update failed: automatic updates do not retry it (the menu still can). */
  let failedCommit: string | null = null
  const startedAt = new Date()
  const machine = hostName()

  const notifyAvailable = (available: AvailableUpdate) => {
    const version = updateLabel(available, DAEMON_VERSION)
    return available.downgrade
      ? desktop.notify(m.older(version), m.olderBody)
      : desktop.notify(m.available(version), m.availableBody)
  }
  const checker = source.ok
    ? new UpdateChecker({
        fetch: (ref) => new SourceUpdater(ctx.exec, source.root).fetch(ref),
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
        (id) => void onTrayClick(id),
        ctx.logger,
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
    }))
    const oldest = shell
      .pendingPermissions()
      .filter((p) => !p.interaction)
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
      machine,
      since: startedAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
      sessions,
      pending,
      phones: shell.phones(),
      canStart: shell.profiles.length > 0,
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

  const runUpdate = () => {
    const available = checker?.state.available
    if (updating || !source.ok || !deps.options.cliPath || !available) return
    updating = true
    ctx.logger.info({ version: available.version, channel: settings.update.channel }, 'updating')
    void desktop.notify(m.updating(updateLabel(available, DAEMON_VERSION)), '')
    try {
      runDetachedUpdate({
        nodePath: process.execPath,
        cliPath: deps.options.cliPath,
        ref: settings.update.channel,
        logFile: join(paths.logs(), 'update.log'),
        systemdRun: Boolean(process.env.INVOCATION_ID),
        // A successful update restarts this daemon; still being here after a failure frees the menu.
        onExit: (code) => {
          if (code === 0) return
          ctx.logger.warn({ code, log: join(paths.logs(), 'update.log') }, 'update failed')
          updating = false
          failedCommit = available.commit
          refreshMenu()
        },
      })
    } catch (error) {
      ctx.logger.warn({ err: error }, 'could not start the update')
      updating = false
      failedCommit = available.commit
    }
    refreshMenu()
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
    await pending
    refreshMenu()
    maybeAutoUpdate()
    return checker
  }

  const reload = async () => {
    const config = await loadConfig(ctx.logger)
    const channelChanged = config.update.channel !== settings.update.channel
    settings = { update: config.update, tray: config.tray }
    refreshMenu()
    if (channelChanged) await check(true)
    else maybeAutoUpdate()
  }

  const saveUpdateSettings = async (patch: Partial<typeof settings.update>) => {
    await updateConfigFile({ update: { ...settings.update, ...patch } })
    await reload()
  }

  const focusSession = async (sessionId: string) => {
    const session = deps.store.get(sessionId)
    if (session?.paneId) await ctx.tmux.focusPane(session.paneId)
  }

  const quote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`

  async function onTrayClick(id: string) {
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
      else if (id === TRAY_ACTIONS.newSession) {
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
    deps.store.onChange(scheduleRefresh)
    ctx.bus.on('permission.requested', scheduleRefresh)
    ctx.bus.on('permission.resolved', scheduleRefresh)
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
  })
  return { checker, tray }
}
