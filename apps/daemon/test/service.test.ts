import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { createLogger } from '../src/core/logger.ts'
import { paths } from '../src/core/paths.ts'
import { MuteStore } from '../src/features/mute/store.ts'
import {
  APP_NAME,
  APP_SCRIPT,
  appExecutablePath,
  bundleLauncherKind,
  daemonProgramArguments,
  dedupePath,
  installAppBundle,
  installService,
  LAUNCHD_LABEL,
  LaunchdService,
  renderAppInfoPlist,
  renderInfoPlistStrings,
  renderPlist,
  serviceStatus,
  USAGE_DESCRIPTION_KEYS,
  usageDescriptions,
} from '../src/features/service/launchd.ts'
import type { ServiceManager } from '../src/features/service/service-manager.ts'
import {
  parseShow,
  renderSystemdUnit,
  SYSTEMD_UNIT,
  SystemdUserService,
  unitPath,
} from '../src/features/service/systemd.ts'
import { execaExecutor } from '../src/infra/exec.ts'
import { buildC, launcherSourcePath } from '../src/infra/native-build.ts'
import { TAILSCALE_NOT_FOUND, waitForWsHost } from '../src/main.ts'
import { fakeExecutor, useTempHome } from './helpers.ts'

const home = useTempHome()
const executable = '/Users/me/.remote-harness/Remote Harness.app/Contents/MacOS/remote-harness'
const options = {
  programArguments: daemonProgramArguments(executable, '/opt/node', '/repo/cli.js'),
  logsDir: '/Users/me/.claude-remote/logs',
  path: '/opt/homebrew/bin:/usr/bin:/bin',
  home: '/Users/me',
}

const onMac = process.platform === 'darwin'

describe('launchd', () => {
  test.skipIf(!onMac)(
    'renders a valid plist that runs node through the app bundle with KeepAlive and the captured PATH',
    async () => {
      const xml = renderPlist(options)
      expect(xml).toContain(`<string>${LAUNCHD_LABEL}</string>`)
      expect(xml).toContain(
        [
          '  <array>',
          `    <string>${executable}</string>`,
          '    <string>/opt/node</string>',
          '    <string>/repo/cli.js</string>',
          '    <string>start</string>',
          '    <string>--wait-tailscale</string>',
          '  </array>',
        ].join('\n'),
      )
      expect(xml).toContain('<key>AssociatedBundleIdentifiers</key>')
      expect(xml).toContain('<key>KeepAlive</key>\n  <true/>')
      expect(xml).toContain('<string>/opt/homebrew/bin:/usr/bin:/bin</string>')
      const file = join(home.dir(), 'x.plist')
      await writeFile(file, xml)
      expect(execFileSync('plutil', ['-lint', file]).toString()).toContain('OK')
    },
  )

  test('install writes the plist with a deduplicated PATH and bootstraps it', async () => {
    const exec = fakeExecutor((c) => (c.args[0] === 'print' ? { exitCode: 113 } : undefined))
    const path = await installService(
      exec,
      { ...options, path: '/a:/b:/a::/c:/b', logsDir: join(home.dir(), 'logs') },
      home.dir(),
      async () => {},
    )
    expect(path).toBe(join(home.dir(), 'Library', 'LaunchAgents', `${LAUNCHD_LABEL}.plist`))
    expect(exec.calls.map((c) => c.args[0])).toEqual(['bootout', 'print', 'bootstrap'])
    expect(exec.calls[2]?.args[2]).toBe(path)
    expect(readFileSync(path, 'utf8')).toContain('<string>/a:/b:/c</string>')
  })

  test('install waits for the old job to unload and retries a failed bootstrap', async () => {
    let prints = 0
    let bootstraps = 0
    const exec = fakeExecutor((c) => {
      if (c.args[0] === 'print') return { exitCode: ++prints < 3 ? 0 : 113 }
      if (c.args[0] === 'bootstrap' && ++bootstraps < 2)
        return { exitCode: 5, stderr: 'Bootstrap failed: 5: Input/output error' }
      return undefined
    })
    const waits: number[] = []
    await installService(exec, { ...options, logsDir: join(home.dir(), 'logs') }, home.dir(), async (ms) => {
      waits.push(ms)
    })
    expect(exec.calls.map((c) => c.args[0])).toEqual([
      'bootout',
      'print',
      'print',
      'print',
      'bootstrap',
      'bootstrap',
    ])
    expect(waits).toEqual([100, 100, 500])
  })

  test('dedupePath keeps the first occurrence of each entry', () => {
    expect(dedupePath('/x:/y:/x:/z')).toBe('/x:/y:/z')
  })

  test.skipIf(!onMac)(
    'app bundle is named Remote Harness and carries the folder usage descriptions',
    async () => {
      const info = renderAppInfoPlist({ hasIcon: true, usage: 'Needs <files> & "folders".' })
      expect(APP_NAME).toBe('Remote Harness')
      expect(info).toContain(`<string>${APP_NAME}</string>`)
      expect(info).toContain(`<string>${LAUNCHD_LABEL}</string>`)
      expect(info).toContain('<key>CFBundleIconFile</key>')
      for (const key of USAGE_DESCRIPTION_KEYS) expect(info).toContain(`<key>${key}</key>`)
      expect(info).toContain('Needs &lt;files&gt; &amp; &quot;folders&quot;.')
      expect(renderAppInfoPlist({ hasIcon: false, usage: 'x' })).not.toContain('CFBundleIconFile')
      const file = join(home.dir(), 'Info.plist')
      await writeFile(file, info)
      expect(execFileSync('plutil', ['-lint', file]).toString()).toContain('OK')

      const strings = join(home.dir(), 'InfoPlist.strings')
      await writeFile(strings, renderInfoPlistStrings('Say "hi" \\ bye'))
      expect(execFileSync('plutil', ['-lint', strings]).toString()).toContain('OK')
      const parsed = JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', strings]).toString())
      expect(parsed.NSDocumentsFolderUsageDescription).toBe('Say "hi" \\ bye')
    },
  )

  test('usage descriptions come from the three catalogs', () => {
    const usage = usageDescriptions()
    expect(Object.keys(usage).sort()).toEqual(['en-US', 'es-ES', 'pt-BR'])
    expect(new Set(Object.values(usage)).size).toBe(3)
  })

  test('installAppBundle falls back to the exec script, writes the translations and signs the bundle', async () => {
    const exec = fakeExecutor()
    const appDir = join(home.dir(), 'Remote Harness.app')
    const usage = usageDescriptions()
    const bundle = await installAppBundle(exec, { appDir, launcher: null, usage })
    expect(bundle).toEqual({ executable: appExecutablePath(appDir), launcher: 'script', rebuilt: true })
    expect(readFileSync(bundle.executable, 'utf8')).toBe(APP_SCRIPT)
    expect(statSync(bundle.executable).mode & 0o111).not.toBe(0)
    expect(await bundleLauncherKind(appDir)).toBe('script')
    const info = readFileSync(join(appDir, 'Contents', 'Info.plist'), 'utf8')
    expect(info).not.toContain('CFBundleIconFile')
    expect(info).toContain(usage['en-US'])
    const resources = join(appDir, 'Contents', 'Resources')
    expect(readFileSync(join(resources, 'pt-BR.lproj', 'InfoPlist.strings'), 'utf8')).toContain(
      usage['pt-BR'],
    )
    expect(readFileSync(join(resources, 'es.lproj', 'InfoPlist.strings'), 'utf8')).toContain(usage['es-ES'])
    expect(exec.calls.map((c) => c.file)).toEqual(['codesign'])
    expect(exec.calls[0]?.args).toEqual(['--force', '--sign', '-', appDir])
  })

  test('installAppBundle leaves an unchanged bundle untouched and rebuilds when the launcher changes', async () => {
    const exec = fakeExecutor()
    const appDir = join(home.dir(), 'Remote Harness.app')
    const usage = usageDescriptions()
    await installAppBundle(exec, { appDir, launcher: null, usage })
    const again = await installAppBundle(exec, { appDir, launcher: null, usage })
    expect(again.rebuilt).toBe(false)
    expect(exec.calls).toHaveLength(1)

    const binary = join(home.dir(), 'launcher-bin')
    await writeFile(binary, Buffer.from([0xcf, 0xfa, 0xed, 0xfe]))
    const native = await installAppBundle(exec, { appDir, launcher: binary, usage })
    expect(native).toMatchObject({ launcher: 'native', rebuilt: true })
    expect(await bundleLauncherKind(appDir)).toBe('native')
    expect(exec.calls).toHaveLength(2)
    expect(await bundleLauncherKind(join(home.dir(), 'none.app'))).toBe('missing')
  })

  test('buildC does not call cc without the Command Line Tools', async () => {
    const source = join(home.dir(), 'x.c')
    await writeFile(source, 'int main(void) { return 0; }\n')
    const exec = fakeExecutor((c) => (c.file === 'xcode-select' ? { exitCode: 2 } : undefined))
    const build = await buildC({ exec, source, buildDir: join(home.dir(), 'build'), name: 'x' })
    expect(build).toEqual({ unavailable: 'Command Line Tools not installed' })
    expect(exec.calls.map((c) => c.file)).toEqual(['xcode-select'])
  })

  test.skipIf(!onMac)('the compiled launcher runs its arguments and returns their exit code', async () => {
    const source = launcherSourcePath()
    expect(source).not.toBeNull()
    const buildDir = join(home.dir(), 'build')
    const build = await buildC({ exec: execaExecutor, source: source ?? '', buildDir, name: 'launcher' })
    if (!('binary' in build)) return // no Command Line Tools on this Mac
    const ran = await execaExecutor(build.binary, ['/bin/sh', '-c', 'exit 7'])
    expect(ran.exitCode).toBe(7)
    // Cached by source hash: a second build reuses the binary without calling cc.
    const exec = fakeExecutor()
    expect(await buildC({ exec, source: source ?? '', buildDir, name: 'launcher' })).toEqual(build)
    expect(exec.calls).toHaveLength(0)
  })

  test('status parses launchctl print', async () => {
    const exec = fakeExecutor(() => ({ stdout: 'state = running\n\tpid = 4242\n' }))
    expect(await serviceStatus(exec)).toEqual({ loaded: true, detail: 'running (pid 4242)' })
    expect(await serviceStatus(fakeExecutor(() => ({ exitCode: 113 })))).toEqual({
      loaded: false,
      detail: 'not loaded',
    })
  })
})

describe('LaunchdService', () => {
  test('builds the app bundle and loads the LaunchAgent, keeping the bootstrap retry', async () => {
    let bootstraps = 0
    const exec = fakeExecutor((c) => {
      if (c.args[0] === 'print') return { exitCode: 113 }
      if (c.args[0] === 'bootstrap' && ++bootstraps < 2) return { exitCode: 5 }
      return undefined
    })
    const appDir = join(home.dir(), 'Remote Harness.app')
    const legacyAppDir = join(home.dir(), 'Claude Remote.app')
    await mkdir(join(legacyAppDir, 'Contents'), { recursive: true })
    const service = new LaunchdService(exec, {
      home: home.dir(),
      appDir,
      legacyAppDir,
      buildDir: join(home.dir(), 'launcher'),
      launcherSource: null,
      sleep: async () => {},
    })
    expect(await service.available()).toBe(true)
    const path = await service.install({
      nodePath: '/n',
      cliPath: '/c',
      logsDir: join(home.dir(), 'logs'),
      path: '/a:/a:/b',
    })
    expect(path).toBe(join(home.dir(), 'Library', 'LaunchAgents', `${LAUNCHD_LABEL}.plist`))
    expect(exec.calls.map((c) => `${c.file} ${c.args[0]}`)).toEqual([
      'codesign --force',
      'launchctl bootout',
      'launchctl print',
      'launchctl bootstrap',
      'launchctl bootstrap',
    ])
    const plist = readFileSync(path, 'utf8')
    expect(plist).toContain(`<string>${appExecutablePath(appDir)}</string>\n    <string>/n</string>`)
    expect(plist).toContain('<string>/a:/b</string>')
    expect(existsSync(legacyAppDir)).toBe(false)
    await service.uninstall()
    expect(existsSync(appDir)).toBe(false)
    expect((service as ServiceManager).linger).toBeUndefined()
  })
})

describe('systemd user service', () => {
  const unit = {
    nodePath: '/usr/bin/node',
    cliPath: '/home/me/.claude-remote/src/apps/daemon/dist/cli.js',
    logsDir: '/home/me/.claude-remote/logs',
    path: '/home/me/.local/bin:/usr/bin:/home/me/.local/bin:/bin',
    home: '/home/me',
  }

  test('renders a unit that restarts the daemon with the captured PATH and appends logs', () => {
    const text = renderSystemdUnit(unit)
    expect(text).toContain(
      'ExecStart="/usr/bin/node" "/home/me/.claude-remote/src/apps/daemon/dist/cli.js" start --wait-tailscale',
    )
    expect(text).toContain('Environment="PATH=/home/me/.local/bin:/usr/bin:/bin"')
    expect(text).toContain('Environment="HOME=/home/me"')
    expect(text).toContain('Restart=always')
    expect(text).toContain('StandardOutput=append:/home/me/.claude-remote/logs/daemon.log')
    expect(text).toContain('StandardError=append:/home/me/.claude-remote/logs/daemon.err.log')
    expect(text).toContain('[Install]\nWantedBy=default.target')
  })

  test('escapes quotes, specifiers and variables', () => {
    const text = renderSystemdUnit({ ...unit, nodePath: '/opt/50%/n"o$de', path: '/a%b' })
    expect(text).toContain('ExecStart="/opt/50%%/n\\"o$$de"')
    expect(text).toContain('Environment="PATH=/a%%b"')
  })

  test('install writes the unit, reloads, enables and restarts it', async () => {
    const exec = fakeExecutor()
    const service = new SystemdUserService(exec, { home: home.dir(), user: 'me' })
    const path = await service.install({ ...unit, logsDir: join(home.dir(), 'logs') })
    expect(path).toBe(unitPath(home.dir()))
    expect(path).toBe(join(home.dir(), '.config', 'systemd', 'user', 'claude-remote.service'))
    expect(readFileSync(path, 'utf8')).toContain('Restart=always')
    expect(statSync(join(home.dir(), 'logs')).isDirectory()).toBe(true)
    expect(exec.calls.map((c) => [c.file, ...c.args].join(' '))).toEqual([
      'systemctl --user daemon-reload',
      `systemctl --user enable --now ${SYSTEMD_UNIT}`,
      `systemctl --user restart ${SYSTEMD_UNIT}`,
    ])
  })

  test('install fails with the systemctl error', async () => {
    const exec = fakeExecutor((c) =>
      c.args[1] === 'enable' ? { exitCode: 1, stderr: 'no bus\n' } : undefined,
    )
    const service = new SystemdUserService(exec, { home: home.dir(), user: 'me' })
    await expect(service.install({ ...unit, logsDir: join(home.dir(), 'logs') })).rejects.toThrow(
      'systemctl --user enable failed: no bus',
    )
  })

  test('uninstall stops, disables and removes the unit', async () => {
    const exec = fakeExecutor()
    const service = new SystemdUserService(exec, { home: home.dir(), user: 'me' })
    await service.install({ ...unit, logsDir: join(home.dir(), 'logs') })
    exec.calls.length = 0
    await service.uninstall()
    expect(exec.calls.map((c) => c.args.slice(1).join(' '))).toEqual([
      `stop ${SYSTEMD_UNIT}`,
      `disable ${SYSTEMD_UNIT}`,
      'daemon-reload',
    ])
    expect(() => statSync(unitPath(home.dir()))).toThrow()
  })

  test('available asks the user manager', async () => {
    const ok = fakeExecutor()
    expect(await new SystemdUserService(ok, { home: '/h', user: 'me' }).available()).toBe(true)
    expect(ok.calls[0]?.args).toEqual(['--user', 'is-active', 'default.target'])
    const noBus = fakeExecutor(() => ({ exitCode: 1, stderr: 'Failed to connect to bus' }))
    expect(await new SystemdUserService(noBus, { home: '/h', user: 'me' }).available()).toBe(false)
  })

  test('status parses systemctl show', async () => {
    const running = fakeExecutor(() => ({
      stdout: 'LoadState=loaded\nActiveState=active\nSubState=running\nMainPID=4242\n',
    }))
    const service = new SystemdUserService(running, { home: '/h', user: 'me' })
    expect(await service.status()).toEqual({ loaded: true, detail: 'running (pid 4242)' })
    expect(running.calls[0]?.args).toEqual([
      '--user',
      'show',
      SYSTEMD_UNIT,
      '--property=LoadState,ActiveState,SubState,MainPID',
    ])
    const dead = fakeExecutor(() => ({
      stdout: 'LoadState=loaded\nActiveState=inactive\nSubState=dead\nMainPID=0\n',
    }))
    expect(await new SystemdUserService(dead, { home: '/h', user: 'me' }).status()).toEqual({
      loaded: true,
      detail: 'dead',
    })
    const missing = fakeExecutor(() => ({ stdout: 'LoadState=not-found\nActiveState=inactive\n' }))
    expect(await new SystemdUserService(missing, { home: '/h', user: 'me' }).status()).toEqual({
      loaded: false,
      detail: 'not loaded',
    })
    expect(parseShow('A=1\nB=x=y\n\n')).toEqual({ A: '1', B: 'x=y' })
  })

  test('lingering is read and enabled through loginctl', async () => {
    const exec = fakeExecutor((c) => (c.args[0] === 'show-user' ? { stdout: 'no\n' } : undefined))
    const { linger } = new SystemdUserService(exec, { home: '/h', user: 'me' })
    expect(await linger.enabled()).toBe(false)
    expect(await linger.enable()).toBe(true)
    expect(exec.calls.map((c) => [c.file, ...c.args].join(' '))).toEqual([
      'loginctl show-user me --property=Linger --value',
      'loginctl enable-linger me',
    ])
    const on = fakeExecutor(() => ({ stdout: 'yes\n' }))
    expect(await new SystemdUserService(on, { home: '/h', user: 'me' }).linger.enabled()).toBe(true)
  })
})

describe('MuteStore', () => {
  test('mutes and unmutes profiles and sessions, persisting the state', async () => {
    const store = new MuteStore(paths.mute())
    await store.load()
    await store.set('profile', 'claudin', true)
    await store.set('session', 's1', true)
    expect(store.isMuted('claudin', 'x')).toBe(true)
    expect(store.isMuted('drclaude', 's1')).toBe(true)
    expect(store.isMuted('drclaude', 's2')).toBe(false)
    await store.set('profile', 'claudin', false)
    const reloaded = new MuteStore(paths.mute())
    await reloaded.load()
    expect(reloaded.get()).toEqual({ profiles: [], sessions: ['s1'] })
  })
})

describe('waitForWsHost', () => {
  const logger = createLogger({ level: 'silent' })

  test('fails fast without Tailscale unless asked to wait', async () => {
    await expect(waitForWsHost({ logger }, 1, () => null)).rejects.toThrow(TAILSCALE_NOT_FOUND)
  })

  test('polls until the Tailscale interface shows up', async () => {
    const answers = [null, null, '100.101.1.2']
    const host = await waitForWsHost({ logger, waitForTailscale: true }, 1, () => answers.shift() ?? null)
    expect(host).toBe('100.101.1.2')
  })

  test('--dev and --host skip discovery', async () => {
    expect(await waitForWsHost({ logger, dev: true }, 1, () => null)).toBe('127.0.0.1')
    expect(await waitForWsHost({ logger, host: '10.0.0.5' }, 1, () => null)).toBe('10.0.0.5')
  })
})
