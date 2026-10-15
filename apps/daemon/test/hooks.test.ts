import { execFile, execFileSync } from 'node:child_process'
import { lstat, mkdir, readFile, stat, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Profile } from '@claude-remote/protocol'
import { describe, expect, test } from 'vitest'
import { EventBus } from '../src/core/event-bus.ts'
import type { DaemonEvents } from '../src/core/events.ts'
import { silentLogger } from '../src/core/logger.ts'
import {
  BACKUP_SUFFIX,
  existingRcFiles,
  installHooks,
  installLaunchers,
  installShellPath,
  shellRcFiles,
  uninstallHooks,
  uninstallShellPath,
} from '../src/features/hooks/installer.ts'
import {
  isDefaultConfigDir,
  removePathBlock,
  renderLauncher,
  upsertPathBlock,
} from '../src/features/hooks/launcher.ts'
import type { HookEvent } from '../src/features/hooks/payloads.ts'
import { HookReceiver, resolveProfileId } from '../src/features/hooks/receiver.ts'
import {
  buildHookEntry,
  isOurHook,
  mergeOurHooks,
  removeOurHooks,
} from '../src/features/hooks/settings-hooks.ts'
import { createHooksServer } from '../src/transport/hooks-server.ts'
import { useTempHome } from './helpers.ts'

const home = useTempHome()
const options = { port: 7338, secret: 's3cr3t', permissionTimeoutSec: 300 }
const userStop = { hooks: [{ type: 'command', command: 'say done' }] }

describe('settings hooks merge', () => {
  test('adds our hooks next to user hooks and is idempotent', () => {
    const settings = { model: 'opus', hooks: { Stop: [userStop] } }
    const once = mergeOurHooks(settings, options)
    const twice = mergeOurHooks(once, options)
    expect(twice).toEqual(once)
    expect(once.model).toBe('opus')
    expect(once.hooks.Stop).toHaveLength(2)
    expect(once.hooks.Stop?.[0]).toEqual(userStop)
    const permission = once.hooks.PermissionRequest?.[0]?.hooks[0]
    expect(permission).toMatchObject({
      type: 'http',
      url: 'http://127.0.0.1:7338/hooks/PermissionRequest',
      timeout: 300,
      allowedEnvVars: ['TMUX_PANE', 'CLAUDE_REMOTE_PROFILE'],
    })
  })

  test('replaces hooks pointing at an old port', () => {
    const once = mergeOurHooks({}, options)
    const moved = mergeOurHooks(once, { ...options, port: 9000 })
    expect(moved.hooks.Stop).toHaveLength(1)
    expect(moved.hooks.Stop?.[0]?.hooks[0]?.url).toBe('http://127.0.0.1:9000/hooks/Stop')
  })

  test('removal restores the user hooks only', () => {
    const settings = { hooks: { Stop: [userStop] } }
    expect(removeOurHooks(mergeOurHooks(settings, options))).toEqual(settings)
    expect(removeOurHooks(mergeOurHooks({ a: 1 }, options))).toEqual({ a: 1 })
  })
})

describe('installer files', () => {
  async function profile(): Promise<Profile> {
    const configDir = join(home.dir(), 'cfg')
    await mkdir(configDir, { recursive: true })
    return { id: 'claudin', name: 'Pessoal', configDir, color: '#fff' }
  }

  test('writes a backup and keeps other keys', async () => {
    const p = await profile()
    const path = join(p.configDir, 'settings.json')
    await writeFile(path, JSON.stringify({ theme: 'dark', hooks: { Stop: [userStop] } }))
    expect(await installHooks(p, options)).toBe(true)
    expect(await installHooks(p, options)).toBe(false)
    const written = JSON.parse(await readFile(path, 'utf8'))
    expect(written.theme).toBe('dark')
    expect(JSON.parse(await readFile(`${path}${BACKUP_SUFFIX}`, 'utf8')).theme).toBe('dark')
    await uninstallHooks(p)
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({ theme: 'dark', hooks: { Stop: [userStop] } })
  })

  test('creates settings.json when missing', async () => {
    const p = await profile()
    await installHooks(p, options)
    const written = JSON.parse(await readFile(join(p.configDir, 'settings.json'), 'utf8'))
    expect(Object.keys(written.hooks)).toHaveLength(7)
  })

  test('launchers are executable and valid zsh', async () => {
    const p = await profile()
    const [path] = await installLaunchers([p], {
      binDir: join(home.dir(), 'bin'),
      tmuxSession: 'claude-remote',
      tmuxBin: 'tmux',
    })
    expect(path).toBeDefined()
    expect((await stat(path!)).mode & 0o111).not.toBe(0)
    execFileSync('zsh', ['-n', path!])
    const content = await readFile(path!, 'utf8')
    expect(content.startsWith('#!/usr/bin/env zsh\n')).toBe(true)
    expect(content).toContain(`export CLAUDE_CONFIG_DIR='${p.configDir}'`)
    expect(content).toContain('; select-window')
  })

  test('PATH block is idempotent, backed up and removable', async () => {
    const zshrc = join(home.dir(), '.zshrc')
    await writeFile(zshrc, 'alias ll="ls -la"\n', { mode: 0o640 })
    expect(await installShellPath('/x/bin', [zshrc])).toEqual([zshrc])
    expect(await installShellPath('/x/bin', [zshrc])).toEqual([])
    expect(await readFile(zshrc, 'utf8')).toContain("export PATH='/x/bin'")
    expect(await readFile(`${zshrc}${BACKUP_SUFFIX}`, 'utf8')).toBe('alias ll="ls -la"\n')
    expect((await stat(zshrc)).mode & 0o777).toBe(0o640)
    expect(await uninstallShellPath([zshrc])).toEqual([zshrc])
    expect(await readFile(zshrc, 'utf8')).toBe('alias ll="ls -la"\n')
    expect(await uninstallShellPath([zshrc])).toEqual([])
  })

  test('PATH block goes to every rc file and creates a missing one without a backup', async () => {
    const zshrc = join(home.dir(), '.zshrc')
    const bashrc = join(home.dir(), '.bashrc')
    await writeFile(zshrc, '# zsh\n')
    expect(await installShellPath('/x/bin', [bashrc, zshrc])).toEqual([bashrc, zshrc])
    expect(await readFile(bashrc, 'utf8')).toBe(
      '# >>> claude-remote >>>\nexport PATH=\'/x/bin\':"$PATH"\n# <<< claude-remote <<<\n',
    )
    await expect(stat(`${bashrc}${BACKUP_SUFFIX}`)).rejects.toThrow()
    execFileSync('bash', ['-n', bashrc])
    const out = execFileSync('bash', ['-c', `source '${bashrc}' && echo "$PATH"`]).toString()
    expect(out.startsWith('/x/bin:')).toBe(true)
  })

  test('PATH block follows a symlinked rc file (dotfile managers)', async () => {
    const real = join(home.dir(), 'dotfiles-zshrc')
    const link = join(home.dir(), '.zshrc')
    await writeFile(real, '# mine\n')
    await symlink(real, link)
    await installShellPath('/x/bin', [link])
    expect((await lstat(link)).isSymbolicLink()).toBe(true)
    expect(await readFile(real, 'utf8')).toContain("export PATH='/x/bin'")
  })

  test('PATH helpers handle empty files', () => {
    const added = upsertPathBlock('', '/b')
    expect(removePathBlock(added)).toBe('')
  })

  test('rc files: the one of $SHELL first, then the other ones that exist', () => {
    const h = '/home/me'
    const present =
      (...names: string[]) =>
      (p: string) =>
        names.some((n) => p === join(h, n))
    // Bash user without ~/.zshrc: only ~/.bashrc
    expect(shellRcFiles({ home: h, shell: '/bin/bash', exists: present(), fallback: '.zshrc' })).toEqual([
      join(h, '.bashrc'),
    ])
    expect(
      shellRcFiles({
        home: h,
        shell: '/usr/bin/zsh',
        exists: present('.bashrc', '.zshrc'),
        fallback: '.zshrc',
      }),
    ).toEqual([join(h, '.zshrc'), join(h, '.bashrc')])
    expect(shellRcFiles({ home: h, shell: '/bin/zsh', exists: present(), fallback: '.bashrc' })).toEqual([
      join(h, '.zshrc'),
    ])
    expect(
      shellRcFiles({ home: h, shell: '/usr/bin/fish', exists: present('.bashrc'), fallback: '.zshrc' }),
    ).toEqual([join(h, '.bashrc')])
    expect(shellRcFiles({ home: h, shell: undefined, exists: present(), fallback: '.bashrc' })).toEqual([
      join(h, '.bashrc'),
    ])
    expect(existingRcFiles(h, present('.bashrc'))).toEqual([join(h, '.bashrc')])
  })
})

describe('launcher script quoting', () => {
  test('quotes single quotes in paths', () => {
    const script = renderLauncher(
      { id: 'x', name: 'X', configDir: "/tmp/it's", color: '' },
      { tmuxSession: 's', tmuxBin: 'tmux' },
    )
    expect(script).toContain(`'/tmp/it'\\''s'`)
  })

  test('the default ~/.claude profile runs with CLAUDE_CONFIG_DIR unset', () => {
    const tmux = { tmuxSession: 's', tmuxBin: 'tmux', home: '/Users/u' }
    const script = renderLauncher({ id: 'p', name: 'P', configDir: '/Users/u/.claude/', color: '' }, tmux)
    execFileSync('zsh', ['-n', '-c', script])
    expect(script).toContain('unset CLAUDE_CONFIG_DIR')
    expect(script).toContain('cmd=(env -u CLAUDE_CONFIG_DIR "$CLAUDE_BIN" "$@")')
    expect(script).not.toContain('-e "CLAUDE_CONFIG_DIR')
    expect(isDefaultConfigDir('/Users/u/.claude-work', '/Users/u')).toBe(false)
  })
})

describe('hook receiver', () => {
  const profiles: Profile[] = [
    { id: 'claudin', name: 'P', configDir: '/Users/u/.claude', color: '' },
    { id: 'drclaude', name: 'D', configDir: '/Users/u/.claude-doctorx', color: '' },
  ]

  test('resolves profile from header or transcript path', () => {
    expect(resolveProfileId('drclaude', undefined, profiles)).toBe('drclaude')
    expect(resolveProfileId(null, '/Users/u/.claude-doctorx/projects/x/s.jsonl', profiles)).toBe('drclaude')
    expect(resolveProfileId(null, '/Users/u/.claude/projects/x/s.jsonl', profiles)).toBe('claudin')
    expect(resolveProfileId(null, undefined, profiles)).toBeNull()
  })

  async function setup() {
    const bus = new EventBus<DaemonEvents>()
    const app = createHooksServer({ secret: 'sec', logger: silentLogger })
    const receiver = new HookReceiver(bus, profiles, silentLogger)
    receiver.register(app)
    const events: HookEvent[] = []
    bus.on('hook', (e) => events.push(e))
    return { app, receiver, events }
  }

  test('publishes SessionStart with pane and profile', async () => {
    const { app, events } = await setup()
    const res = await app.inject({
      method: 'POST',
      url: '/hooks/SessionStart',
      headers: {
        'x-claude-remote-secret': 'sec',
        'x-claude-remote-pane': '%12',
        'x-claude-remote-profile': 'claudin',
      },
      payload: { session_id: 'abc', cwd: '/w', source: 'startup', hook_event_name: 'SessionStart' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({})
    expect(events[0]).toMatchObject({ event: 'SessionStart', paneId: '%12', profileId: 'claudin' })
    expect(events[0]?.payload.source).toBe('startup')
  })

  test('the SessionStart command hook posts stdin with pane and profile and prints nothing', async () => {
    const { app, events } = await setup()
    await app.listen({ host: '127.0.0.1', port: 0 })
    try {
      const address = app.server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      const entry = buildHookEntry('SessionStart', { port, secret: 'sec', permissionTimeoutSec: 300 })
      expect(entry.type).toBe('command')
      expect(isOurHook(entry)).toBe(true)
      const stdout = await new Promise<string>((resolve, reject) => {
        const child = execFile(
          'sh',
          ['-c', String(entry.command)],
          { env: { PATH: process.env.PATH, TMUX_PANE: '%7', CLAUDE_REMOTE_PROFILE: 'claudin' } },
          (error, out) => (error ? reject(error) : resolve(out)),
        )
        child.stdin?.end(JSON.stringify({ session_id: 'abc', cwd: '/w', source: 'resume' }))
      })
      expect(stdout).toBe('')
      expect(events[0]).toMatchObject({ event: 'SessionStart', paneId: '%7', profileId: 'claudin' })
      expect(events[0]?.payload.source).toBe('resume')
    } finally {
      await app.close()
    }
  })

  test('treats empty or unexpanded env headers as missing', async () => {
    const { app, events } = await setup()
    await app.inject({
      method: 'POST',
      url: '/hooks/Stop',
      headers: {
        'x-claude-remote-secret': 'sec',
        'x-claude-remote-pane': '$TMUX_PANE',
        'x-claude-remote-profile': '',
      },
      payload: { session_id: 'abc' },
    })
    expect(events[0]).toMatchObject({ paneId: null, profileId: null })
  })

  test('rejects unknown events, bad payloads and missing secret', async () => {
    const { app } = await setup()
    const headers = { 'x-claude-remote-secret': 'sec' }
    expect((await app.inject({ method: 'POST', url: '/hooks/Nope', headers, payload: {} })).statusCode).toBe(
      404,
    )
    expect((await app.inject({ method: 'POST', url: '/hooks/Stop', headers, payload: {} })).statusCode).toBe(
      400,
    )
    expect(
      (await app.inject({ method: 'POST', url: '/hooks/Stop', payload: { session_id: 'a' } })).statusCode,
    ).toBe(401)
  })

  test('uses the responder for decision hooks', async () => {
    const { app, receiver } = await setup()
    receiver.setResponder('PermissionRequest', async () => ({ decided: true }))
    const res = await app.inject({
      method: 'POST',
      url: '/hooks/PermissionRequest',
      headers: { 'x-claude-remote-secret': 'sec' },
      payload: { session_id: 'abc', tool_name: 'Bash' },
    })
    expect(res.json()).toEqual({ decided: true })
  })
})
