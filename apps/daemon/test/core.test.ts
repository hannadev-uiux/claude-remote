import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test, vi } from 'vitest'
import { ConfigError, loadConfig, resolveProfiles } from '../src/core/config.ts'
import { EventBus } from '../src/core/event-bus.ts'
import { silentLogger } from '../src/core/logger.ts'
import { paths } from '../src/core/paths.ts'
import {
  ensureToken,
  FileTokenStore,
  KeychainTokenStore,
  SecretToolTokenStore,
  selectTokenStore,
  TOKEN_STORE_KINDS,
} from '../src/core/secrets.ts'
import { findTailscaleAddress, isTailscaleAddress } from '../src/infra/network.ts'
import { fakeExecutor, useTempHome } from './helpers.ts'

const home = useTempHome()

describe('EventBus', () => {
  test('delivers payloads and unsubscribes', () => {
    const bus = new EventBus<{ a: number }>()
    const fn = vi.fn()
    const off = bus.on('a', fn)
    bus.emit('a', 1)
    off()
    bus.emit('a', 2)
    expect(fn).toHaveBeenCalledExactlyOnceWith(1)
  })
})

describe('config', () => {
  test('creates default profiles on first run', async () => {
    const config = await loadConfig(silentLogger)
    expect(config.profiles.map((p) => p.id)).toEqual(['claudin'])
    expect(config.wsPort).toBe(7337)
    const written = JSON.parse(await readFile(paths.config(), 'utf8'))
    expect(written.profiles).toHaveLength(1)
  })

  test('fails with the invalid field', async () => {
    await mkdir(join(home.dir(), '.claude-remote'), { recursive: true })
    await writeFile(paths.config(), JSON.stringify({ profiles: [{ id: 'x' }] }))
    await expect(loadConfig(silentLogger)).rejects.toThrow(/profiles\.0\.name/)
  })

  test('fails on invalid JSON', async () => {
    await mkdir(join(home.dir(), '.claude-remote'), { recursive: true })
    await writeFile(paths.config(), '{nope')
    await expect(loadConfig(silentLogger)).rejects.toBeInstanceOf(ConfigError)
  })

  test('ignores profiles whose config dir is missing', async () => {
    const existing = join(home.dir(), 'profile-a')
    await mkdir(existing)
    const config = await loadConfig(silentLogger)
    const warn = vi.spyOn(silentLogger, 'warn')
    const profiles = await resolveProfiles(
      {
        ...config,
        profiles: [
          { id: 'a', name: 'A', configDir: existing, color: '#fff' },
          { id: 'b', name: 'B', configDir: join(home.dir(), 'missing'), color: '#fff' },
        ],
      },
      silentLogger,
    )
    expect(profiles.map((p) => p.id)).toEqual(['a'])
    expect(warn).toHaveBeenCalled()
  })
})

describe('token stores', () => {
  test('keychain store writes through security -i stdin, never in the arguments', async () => {
    let stored: string | null = null
    const exec = fakeExecutor((call) => {
      if (call.args[0] === '-i') stored = /-w "([^"]+)"/.exec(call.options?.input ?? '')?.[1] ?? null
      if (call.args[0] === 'find-generic-password')
        return stored ? { stdout: `${stored}\n` } : { exitCode: 44, stdout: '' }
      return undefined
    })
    const token = await ensureToken(new KeychainTokenStore(exec))
    expect(token.length).toBeGreaterThan(30)
    expect(exec.calls.map((c) => c.args[0])).toEqual(['find-generic-password', '-i', 'find-generic-password'])
    expect(exec.calls.flatMap((c) => c.args)).not.toContain(token)
    expect(exec.calls[1]?.options?.input).toContain(
      'add-generic-password -U -s claude-remote -a pairing-token',
    )
  })

  test('keychain store fails when the token cannot be read back', async () => {
    const exec = fakeExecutor((call) =>
      call.args[0] === 'find-generic-password' ? { exitCode: 44 } : undefined,
    )
    await expect(new KeychainTokenStore(exec).set('abc')).rejects.toThrow(/keychain write failed/)
  })

  test('keeps an existing token', async () => {
    const exec = fakeExecutor(() => ({ stdout: 'abc\n' }))
    expect(await ensureToken(new KeychainTokenStore(exec))).toBe('abc')
  })

  test('file store persists with restricted permissions', async () => {
    const store = new FileTokenStore()
    const token = await ensureToken(store)
    expect(await new FileTokenStore().get()).toBe(token)
    expect((await stat(paths.tokenFile())).mode & 0o777).toBe(0o600)
  })
})

describe('secret-tool token store', () => {
  test('stores the token on stdin, never in the arguments', async () => {
    const exec = fakeExecutor((c) => (c.args[0] === 'lookup' ? { exitCode: 1 } : undefined))
    const token = await ensureToken(new SecretToolTokenStore(exec))
    expect(exec.calls.map((c) => [c.file, ...c.args].join(' '))).toEqual([
      'secret-tool lookup service claude-remote account pairing-token',
      'secret-tool store --label=Claude Remote pairing token service claude-remote account pairing-token',
    ])
    expect(exec.calls[1]?.options?.input).toBe(token)
    for (const call of exec.calls) expect(call.args).not.toContain(token)
  })

  test('reads an existing token', async () => {
    const exec = fakeExecutor(() => ({ stdout: 'abc\n' }))
    expect(await new SecretToolTokenStore(exec).get()).toBe('abc')
  })

  test('a failing Secret Service is an error, not a missing token', async () => {
    const exec = fakeExecutor(() => ({ exitCode: 1, stderr: 'Cannot autolaunch D-Bus without X11 $DISPLAY' }))
    await expect(new SecretToolTokenStore(exec).get()).rejects.toThrow('secret-tool lookup failed')
    const failing = fakeExecutor((c) =>
      c.args[0] === 'store' ? { exitCode: 1, stderr: 'locked' } : undefined,
    )
    await expect(new SecretToolTokenStore(failing).set('t')).rejects.toThrow(
      'secret-tool store failed: locked',
    )
  })
})

describe('token store selection', () => {
  const linux = (respond: Parameters<typeof fakeExecutor>[0]) => ({
    platform: 'linux' as const,
    exec: fakeExecutor(respond),
  })

  test('macOS uses the Keychain', async () => {
    const exec = fakeExecutor()
    const selected = await selectTokenStore({ platform: 'darwin', exec })
    expect(selected.kind).toBe('keychain')
    expect(selected.store).toBeInstanceOf(KeychainTokenStore)
    expect(exec.calls).toEqual([])
  })

  test('CLAUDE_REMOTE_TOKEN_STORE forces a store', async () => {
    for (const forced of TOKEN_STORE_KINDS) {
      const selected = await selectTokenStore({ platform: 'darwin', exec: fakeExecutor(), forced })
      expect(selected.kind).toBe(forced)
    }
    const file = await selectTokenStore({ platform: 'linux', exec: fakeExecutor(), forced: 'file' })
    expect(file.store).toBeInstanceOf(FileTokenStore)
    const unknown = await selectTokenStore({ platform: 'darwin', exec: fakeExecutor(), forced: 'vault' })
    expect(unknown.kind).toBe('keychain')
  })

  test('Linux without secret-tool falls back to the 0600 file and records it', async () => {
    const o = linux((c) => (c.file === 'which' ? { exitCode: 1 } : undefined))
    const selected = await selectTokenStore(o)
    expect(selected.kind).toBe('file')
    expect(await readFile(paths.tokenStoreChoice(), 'utf8')).toBe('file\n')
    expect(o.exec.calls.map((c) => c.file)).toEqual(['which'])
  })

  test('Linux without a Secret Service (headless) uses the file', async () => {
    const o = linux((c) =>
      c.file === 'secret-tool'
        ? { exitCode: 1, stderr: 'The name org.freedesktop.secrets was not provided by any .service files' }
        : undefined,
    )
    expect((await selectTokenStore(o)).kind).toBe('file')
  })

  test('Linux with a working Secret Service uses secret-tool', async () => {
    const o = linux((c) => (c.file === 'secret-tool' ? { exitCode: 1 } : undefined))
    const selected = await selectTokenStore(o)
    expect(selected.kind).toBe('secret-tool')
    expect(selected.store).toBeInstanceOf(SecretToolTokenStore)
  })

  test('a token already in the file keeps the file store (pairing survives)', async () => {
    await new FileTokenStore().set('existing')
    const o = linux((c) => (c.file === 'secret-tool' ? { exitCode: 1 } : undefined))
    expect((await selectTokenStore(o)).kind).toBe('file')
    const found = linux((c) => (c.file === 'secret-tool' ? { stdout: 'kept\n' } : undefined))
    await rm(paths.tokenStoreChoice())
    expect((await selectTokenStore(found)).kind).toBe('secret-tool')
  })

  test('the recorded choice wins over a new probe', async () => {
    await mkdir(join(home.dir(), '.claude-remote'), { recursive: true })
    await writeFile(paths.tokenStoreChoice(), 'secret-tool\n')
    const o = linux(() => ({ exitCode: 1 }))
    expect((await selectTokenStore(o)).kind).toBe('secret-tool')
    expect(o.exec.calls).toEqual([])
  })
})

describe('tailscale discovery', () => {
  test('accepts only 100.64.0.0/10', () => {
    expect(isTailscaleAddress('100.64.0.1')).toBe(true)
    expect(isTailscaleAddress('100.127.255.255')).toBe(true)
    expect(isTailscaleAddress('100.128.0.1')).toBe(false)
    expect(isTailscaleAddress('192.168.0.10')).toBe(false)
  })

  test('picks the tailscale interface', () => {
    const iface = (address: string, internal = false) => ({
      address,
      internal,
      family: 'IPv4' as const,
      netmask: '',
      mac: '',
      cidr: null,
    })
    expect(findTailscaleAddress({ en0: [iface('192.168.0.2')], utun4: [iface('100.101.1.2')] })).toBe(
      '100.101.1.2',
    )
    expect(findTailscaleAddress({ en0: [iface('192.168.0.2')] })).toBeNull()
  })
})
