import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { paths } from '../src/core/paths.ts'
import { MuteStore } from '../src/features/mute/store.ts'
import { installService, LAUNCHD_LABEL, renderPlist, serviceStatus } from '../src/features/service/launchd.ts'
import { fakeExecutor, useTempHome } from './helpers.ts'

const home = useTempHome()
const options = {
  nodePath: '/opt/node/bin/node',
  cliPath: '/repo/apps/daemon/dist/cli.js',
  logsDir: '/Users/me/.claude-remote/logs',
  path: '/opt/homebrew/bin:/usr/bin:/bin',
  home: '/Users/me',
}

describe('launchd', () => {
  test('renders a valid plist with KeepAlive and the captured PATH', async () => {
    const xml = renderPlist(options)
    expect(xml).toContain(`<string>${LAUNCHD_LABEL}</string>`)
    expect(xml).toContain('<key>KeepAlive</key>\n  <true/>')
    expect(xml).toContain('<string>/opt/homebrew/bin:/usr/bin:/bin</string>')
    const file = join(home.dir(), 'x.plist')
    await writeFile(file, xml)
    expect(execFileSync('plutil', ['-lint', file]).toString()).toContain('OK')
  })

  test('install writes the plist and bootstraps it', async () => {
    const exec = fakeExecutor()
    const path = await installService(exec, { ...options, logsDir: join(home.dir(), 'logs') }, home.dir())
    expect(path).toBe(join(home.dir(), 'Library', 'LaunchAgents', `${LAUNCHD_LABEL}.plist`))
    expect(exec.calls.map((c) => c.args[0])).toEqual(['bootout', 'bootstrap'])
    expect(exec.calls[1]?.args[2]).toBe(path)
  })

  test('status parses launchctl print', async () => {
    const exec = fakeExecutor(() => ({ stdout: 'state = running\n\tpid = 4242\n' }))
    expect(await serviceStatus(exec)).toEqual({ loaded: true, detail: 'running (pid 4242)' })
    expect(await serviceStatus(fakeExecutor(() => ({ exitCode: 113 })))).toEqual({
      loaded: false,
      detail: 'não carregado',
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
