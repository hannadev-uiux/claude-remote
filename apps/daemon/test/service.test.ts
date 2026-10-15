import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { createLogger } from '../src/core/logger.ts'
import { paths } from '../src/core/paths.ts'
import { MuteStore } from '../src/features/mute/store.ts'
import {
  APP_NAME,
  appExecutablePath,
  dedupePath,
  installAppBundle,
  installService,
  LAUNCHD_LABEL,
  renderAppInfoPlist,
  renderAppLauncher,
  renderPlist,
  serviceStatus,
} from '../src/features/service/launchd.ts'
import { TAILSCALE_NOT_FOUND, waitForWsHost } from '../src/main.ts'
import { fakeExecutor, useTempHome } from './helpers.ts'

const home = useTempHome()
const options = {
  executable: '/Users/me/.claude-remote/Claude Remote.app/Contents/MacOS/claude-remote',
  logsDir: '/Users/me/.claude-remote/logs',
  path: '/opt/homebrew/bin:/usr/bin:/bin',
  home: '/Users/me',
}

describe('launchd', () => {
  test('renders a valid plist that runs the app bundle with KeepAlive and the captured PATH', async () => {
    const xml = renderPlist(options)
    expect(xml).toContain(`<string>${LAUNCHD_LABEL}</string>`)
    expect(xml).toContain(
      '<string>/Users/me/.claude-remote/Claude Remote.app/Contents/MacOS/claude-remote</string>',
    )
    expect(xml).toContain('<key>AssociatedBundleIdentifiers</key>')
    expect(xml).toContain('<key>KeepAlive</key>\n  <true/>')
    expect(xml).toContain('<string>/opt/homebrew/bin:/usr/bin:/bin</string>')
    const file = join(home.dir(), 'x.plist')
    await writeFile(file, xml)
    expect(execFileSync('plutil', ['-lint', file]).toString()).toContain('OK')
  })

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

  test('app bundle is named Claude Remote and execs the daemon waiting for Tailscale', async () => {
    const info = renderAppInfoPlist(true)
    expect(info).toContain(`<string>${APP_NAME}</string>`)
    expect(info).toContain(`<string>${LAUNCHD_LABEL}</string>`)
    expect(info).toContain('<key>CFBundleIconFile</key>')
    expect(renderAppInfoPlist(false)).not.toContain('CFBundleIconFile')
    const file = join(home.dir(), 'Info.plist')
    await writeFile(file, info)
    expect(execFileSync('plutil', ['-lint', file]).toString()).toContain('OK')

    expect(renderAppLauncher("/opt/it's/node", '/repo/cli.js')).toBe(
      "#!/bin/sh\nexec '/opt/it'\\''s/node' '/repo/cli.js' start --wait-tailscale\n",
    )
  })

  test('installAppBundle writes an executable launcher and signs the bundle', async () => {
    const exec = fakeExecutor()
    const appDir = join(home.dir(), 'Claude Remote.app')
    const executable = await installAppBundle(exec, { appDir, nodePath: '/n', cliPath: '/c' })
    expect(executable).toBe(appExecutablePath(appDir))
    expect(statSync(executable).mode & 0o111).not.toBe(0)
    expect(readFileSync(join(appDir, 'Contents', 'Info.plist'), 'utf8')).not.toContain('CFBundleIconFile')
    expect(exec.calls.map((c) => c.file)).toEqual(['codesign'])
    expect(exec.calls[0]?.args).toEqual(['--force', '--sign', '-', appDir])
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
